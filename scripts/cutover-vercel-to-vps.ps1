param(
  [Parameter(Mandatory = $true)]
  [string]$ApiBaseUrl
)

$ErrorActionPreference = 'Stop'

if (-not $ApiBaseUrl.StartsWith('https://')) {
  throw 'Use URL HTTPS completa. Exemplo: https://api.seudominio.com/api'
}

Write-Host "Aplicando VITE_API_BASE_URL=$ApiBaseUrl na Vercel..."

function Set-VercelEnvVar {
  param(
    [string]$Name,
    [string]$Value,
    [string]$Environment
  )

  $payload = "n`n$Value`n"
  $payload | vercel env add $Name $Environment --force | Out-Host
}

Set-VercelEnvVar -Name 'VITE_API_BASE_URL' -Value $ApiBaseUrl -Environment 'production'
Set-VercelEnvVar -Name 'VITE_API_BASE_URL' -Value $ApiBaseUrl -Environment 'preview'
Set-VercelEnvVar -Name 'VITE_API_BASE_URL' -Value $ApiBaseUrl -Environment 'development'

Write-Host 'Fazendo deploy de producao...'
vercel --prod --yes | Out-Host

Write-Host 'Cutover concluido.'
