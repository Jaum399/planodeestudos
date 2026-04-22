param(
  [Parameter(Mandatory = $false)]
  [string]$Repo = "Jaum399/planodeestudos",

  [Parameter(Mandatory = $false)]
  [string]$P12Path,

  [Parameter(Mandatory = $false)]
  [string]$P12Base64,

  [Parameter(Mandatory = $true)]
  [string]$P12Password,

  [Parameter(Mandatory = $false)]
  [string]$ProvisionProfilePath,

  [Parameter(Mandatory = $false)]
  [string]$ProvisionProfileBase64,

  [Parameter(Mandatory = $false)]
  [string]$KeychainPassword,

  [Parameter(Mandatory = $false)]
  [string]$AppleTeamId,

  [Parameter(Mandatory = $false)]
  [string]$AppStoreKeyId,

  [Parameter(Mandatory = $false)]
  [string]$AppStoreIssuerId,

  [Parameter(Mandatory = $false)]
  [string]$AppStorePrivateKeyPath
)

$ErrorActionPreference = "Stop"

function New-RandomSecret {
  param([int]$Bytes = 32)
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return [Convert]::ToBase64String($buffer).TrimEnd('=')
}

function To-Base64NoWrap {
  param([Parameter(Mandatory = $true)][string]$FilePath)
  if (-not (Test-Path -LiteralPath $FilePath)) {
    throw "Arquivo nao encontrado: $FilePath"
  }
  $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $FilePath))
  return [System.Convert]::ToBase64String($bytes)
}

function Try-GetTeamIdFromProfile {
  param([string]$ProfilePath)
  if (-not $ProfilePath -or -not (Test-Path -LiteralPath $ProfilePath)) {
    return $null
  }

  try {
    $openssl = Get-Command openssl -ErrorAction Stop
    $plist = & $openssl.Source smime -inform der -verify -noverify -in $ProfilePath 2>$null
    if (-not $plist) {
      return $null
    }

    $match = [regex]::Match($plist, '<key>TeamIdentifier</key>\s*<array>\s*<string>([^<]+)</string>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($match.Success) {
      return $match.Groups[1].Value.Trim()
    }
  }
  catch {
    return $null
  }

  return $null
}

if (-not $P12Base64) {
  if (-not $P12Path) {
    throw "Informe -P12Path ou -P12Base64."
  }
  $P12Base64 = To-Base64NoWrap -FilePath $P12Path
}

if (-not $ProvisionProfileBase64) {
  if (-not $ProvisionProfilePath) {
    throw "Informe -ProvisionProfilePath ou -ProvisionProfileBase64."
  }
  $ProvisionProfileBase64 = To-Base64NoWrap -FilePath $ProvisionProfilePath
}

if (-not $KeychainPassword) {
  $KeychainPassword = New-RandomSecret
  Write-Host "KEYCHAIN_PASSWORD gerado automaticamente."
}

if (-not $AppleTeamId) {
  $AppleTeamId = Try-GetTeamIdFromProfile -ProfilePath $ProvisionProfilePath
  if ($AppleTeamId) {
    Write-Host "APPLE_TEAM_ID detectado automaticamente: $AppleTeamId"
  } else {
    throw "Nao foi possivel detectar APPLE_TEAM_ID automaticamente. Informe -AppleTeamId."
  }
}

Write-Host "Validando GitHub CLI..."
$null = gh --version
$null = gh auth status

Write-Host "Enviando secrets obrigatorios para $Repo..."
$P12Base64 | gh secret set IOS_CERTIFICATE_P12_BASE64 -R $Repo --body -
$P12Password | gh secret set IOS_CERTIFICATE_PASSWORD -R $Repo --body -
$ProvisionProfileBase64 | gh secret set IOS_PROVISION_PROFILE_BASE64 -R $Repo --body -
$KeychainPassword | gh secret set KEYCHAIN_PASSWORD -R $Repo --body -
$AppleTeamId | gh secret set APPLE_TEAM_ID -R $Repo --body -

if ($AppStoreKeyId -and $AppStoreIssuerId -and $AppStorePrivateKeyPath) {
  Write-Host "Configurando secrets opcionais do App Store Connect..."
  $ascP8B64 = To-Base64NoWrap -FilePath $AppStorePrivateKeyPath
  $AppStoreKeyId | gh secret set APPSTORE_KEY_ID -R $Repo --body -
  $AppStoreIssuerId | gh secret set APPSTORE_ISSUER_ID -R $Repo --body -
  $ascP8B64 | gh secret set APPSTORE_PRIVATE_KEY_BASE64 -R $Repo --body -
} else {
  Write-Host "Secrets opcionais APPSTORE_* nao enviados (TestFlight automatico sera pulado)."
}

Write-Host "Concluido. Secrets configurados com sucesso."