$ErrorActionPreference = 'Stop'

$nodePath = 'D:\tools\mise\data\installs\node\24.15.0\node.exe'

if (-not (Test-Path -LiteralPath $nodePath)) {
    throw "Node 24 executable not found: $nodePath"
}

[Environment]::SetEnvironmentVariable('NODE_REPL_NODE_PATH', $nodePath, 'User')

Write-Host "NODE_REPL_NODE_PATH has been set to:"
Write-Host "  $nodePath"
Write-Host ''
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

Write-Host 'Restarting Explorer so apps launched from Start/Desktop inherit the new environment...'
Get-Process explorer -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Process explorer.exe

Write-Host ''
Write-Host 'Closing Codex helper processes so the browser plugin can reload the new environment...'

Get-Process Codex, codex, node_repl -ErrorAction SilentlyContinue | Stop-Process -Force
