param(
    [string]$NodePath = '',
    [switch]$RestartCodex
)

$ErrorActionPreference = 'Stop'

function Resolve-NodePath {
    param([string]$RequestedPath)

    $candidates = @()

    if ($RequestedPath) {
        $candidates += $RequestedPath
    }

    $currentUserValue = [Environment]::GetEnvironmentVariable('NODE_REPL_NODE_PATH', 'User')
    if ($currentUserValue) {
        $candidates += $currentUserValue
    }

    $candidates += @(
        'D:\tools\Volta\tools\image\node\24.15.0\node.exe',
        "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe",
        "$env:LOCALAPPDATA\OpenAI\Codex\bin\node.exe"
    )

    $pathNode = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($pathNode) {
        $candidates += $pathNode.Source
    }

    foreach ($candidate in $candidates | Where-Object { $_ } | Select-Object -Unique) {
        if (Test-Path -LiteralPath $candidate) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    throw 'No usable Node executable was found.'
}

function Assert-NodeVersion {
    param([string]$ResolvedNodePath)

    $versionText = (& $ResolvedNodePath -v).Trim()

    if ($versionText -notmatch '^v(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)$') {
        throw "Unable to parse Node version from $ResolvedNodePath`: $versionText"
    }

    $major = [int]$Matches.major

    if ($major -lt 20) {
        throw "Codex browser-use requires Node 20 or newer. Found $versionText at $ResolvedNodePath"
    }

    return $versionText
}

function Broadcast-EnvironmentChange {
    Write-Host 'Broadcasting the Windows environment change...'

    $signature = @'
using System;
using System.Runtime.InteropServices;

public static class EnvironmentBroadcaster {
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessageTimeout(
        IntPtr hWnd,
        uint Msg,
        UIntPtr wParam,
        string lParam,
        uint fuFlags,
        uint uTimeout,
        out UIntPtr lpdwResult);
}
'@

    Add-Type -TypeDefinition $signature -ErrorAction SilentlyContinue
    $result = [UIntPtr]::Zero
    [EnvironmentBroadcaster]::SendMessageTimeout(
        [IntPtr]0xffff,
        0x001A,
        [UIntPtr]::Zero,
        'Environment',
        0x0002,
        5000,
        [ref]$result
    ) | Out-Null
}

function Stop-CodexProcesses {
    Write-Host 'Stopping Codex and Codex helper processes...'

    Get-CimInstance Win32_Process |
        Where-Object {
            $_.Name -in @('Codex.exe', 'codex.exe', 'node_repl.exe') -or
            (
                $_.Name -eq 'node.exe' -and
                $_.ExecutablePath -like "$env:LOCALAPPDATA\OpenAI\Codex\bin\*"
            )
        } |
        ForEach-Object {
            Write-Host "  stopping $($_.Name) pid=$($_.ProcessId)"
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
}

function Start-CodexApp {
    Write-Host 'Starting Codex...'
    Start-Process 'explorer.exe' 'shell:AppsFolder\OpenAI.Codex_2p2nqsd0c76g0!App'
}

function Repair-BrowserUseClient {
    $clientPath = Join-Path $env:USERPROFILE '.codex\plugins\cache\openai-bundled\browser-use\0.1.0-alpha1\scripts\browser-client.mjs'

    if (-not (Test-Path -LiteralPath $clientPath)) {
        Write-Host "Browser Use client was not found: $clientPath"
        return
    }

    $backupPath = "$clientPath.bak-codex-native-pipe"
    if (-not (Test-Path -LiteralPath $backupPath)) {
        Copy-Item -LiteralPath $clientPath -Destination $backupPath
    }

    $text = [IO.File]::ReadAllText($clientPath)

    $oldImport = 'import{Buffer as bN}from"node:buffer";import{readdir as zT}from"node:fs/promises";import tN,{platform as Km}from"node:os";'
    $newImport = 'import{Buffer as bN}from"node:buffer";import{readdir as zT}from"node:fs/promises";import{createConnection as __codexNetCreateConnection}from"node:net";import tN,{platform as Km}from"node:os";'
    if ($text.Contains($oldImport)) {
        $text = $text.Replace($oldImport, $newImport)
    }

    $oldBridge = 'function Q7(){return"privileged native pipe bridge is not available"}function eN(){let e=import.meta.__codexNativePipe;return e==null||typeof e.createConnection!="function"?null:e}var Hl=class e{'
    $newBridge = 'function Q7(){return"privileged native pipe bridge is not available"}var __codexNativePipeFallback={createConnection:e=>new Promise((t,n)=>{let r=__codexNetCreateConnection(e),i=o=>{r.off("connect",s),n(o)},s=()=>{r.off("error",i),t(r)};r.once("error",i),r.once("connect",s)})};function eN(){let e=import.meta.__codexNativePipe;return e!=null&&typeof e.createConnection=="function"?e:__codexNativePipeFallback}var Hl=class e{'
    if ($text.Contains($oldBridge)) {
        $text = $text.Replace($oldBridge, $newBridge)
    }

    $text = $text.Replace('function W1(){Xy(),H1()}', 'function W1(){}')
    $text = $text.Replace('ku("browser_use_setup")', 'void 0')
    $text = $text.Replace('ku("browser_use_agent_command",f.type)', 'void 0')

    [IO.File]::WriteAllText($clientPath, $text, [Text.UTF8Encoding]::new($false))
    Write-Host 'Browser Use client native-pipe and telemetry fixes are applied.'
}

$resolvedNodePath = Resolve-NodePath -RequestedPath $NodePath
$nodeVersion = Assert-NodeVersion -ResolvedNodePath $resolvedNodePath

[Environment]::SetEnvironmentVariable('NODE_REPL_NODE_PATH', $resolvedNodePath, 'User')
$env:NODE_REPL_NODE_PATH = $resolvedNodePath

Write-Host 'NODE_REPL_NODE_PATH has been set to:'
Write-Host "  $resolvedNodePath"
Write-Host "  $nodeVersion"
Write-Host ''

Broadcast-EnvironmentChange
Repair-BrowserUseClient

if ($RestartCodex) {
    Stop-CodexProcesses
    Start-Sleep -Seconds 2
    Start-CodexApp
    Write-Host ''
    Write-Host 'Codex was restarted. Open this workspace again and retry Browser Use.'
} else {
    Write-Host ''
    Write-Host 'Environment is fixed for newly started Codex processes.'
    Write-Host 'Run this script with -RestartCodex, or use the BAT wrapper, to clear stale browser-use pipes.'
}
