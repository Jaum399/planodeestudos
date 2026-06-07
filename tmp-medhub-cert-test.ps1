$base = "https://app-tigas-entregas.vercel.app/api"

function New-ValidCpf {
  $nums = @()
  1..9 | ForEach-Object { $nums += (Get-Random -Minimum 0 -Maximum 10) }
  $sum1 = 0
  for ($i = 0; $i -lt 9; $i++) { $sum1 += $nums[$i] * (10 - $i) }
  $d1 = (($sum1 * 10) % 11)
  if ($d1 -eq 10) { $d1 = 0 }
  $nums += $d1
  $sum2 = 0
  for ($i = 0; $i -lt 10; $i++) { $sum2 += $nums[$i] * (11 - $i) }
  $d2 = (($sum2 * 10) % 11)
  if ($d2 -eq 10) { $d2 = 0 }
  $nums += $d2
  return ($nums -join '')
}

function Invoke-JsonRequest {
  param([string]$Method,[string]$Url,[object]$Body,[string]$Token)
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  $jsonBody = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 8 } else { $null }
  try {
    $resp = Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -Body $jsonBody -ErrorAction Stop
    return @{ ok = $true; status = 200; body = $resp }
  } catch {
    $status = 0
    $raw = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $raw = $reader.ReadToEnd()
      } catch {}
    }
    return @{ ok = $false; status = $status; body = $raw }
  }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$userEmail = "qa.medhub.$stamp@example.com"
$userPass = "Qa@123456"
$userCpf = New-ValidCpf

Write-Host "== Criando usuário comum =="
$register = Invoke-JsonRequest -Method "POST" -Url "$base/auth/register" -Body @{
  name = "QA MedHub $stamp"
  email = $userEmail
  password = $userPass
  area = "Medicina"
  billingDocument = $userCpf
}

if (-not $register.ok) {
  Write-Host "Falha no cadastro usuário comum. HTTP $($register.status)"
  Write-Host $register.body
  exit 1
}

$userToken = $register.body.token
$userId = $register.body.user.id
Write-Host "Usuário comum criado: $userEmail (id=$userId)"

Write-Host "`n== Teste 1: usuário comum sem certificação deve ser bloqueado =="
$t1 = Invoke-JsonRequest -Method "GET" -Url "$base/medhub/workspace" -Body $null -Token $userToken
Write-Host "HTTP:" $t1.status
if ($t1.ok) {
  Write-Host "ERRO: workspace liberado sem certificação"
} else {
  Write-Host "Resposta:" $t1.body
}

Write-Host "`n== Teste 2: submissão CRM e validação de status =="
$submit = Invoke-JsonRequest -Method "POST" -Url "$base/medhub/certification" -Body @{
  type = "doctor"
  crm_number = "12345"
  crm_state = "SP"
} -Token $userToken
Write-Host "Submit HTTP:" $submit.status
if (-not $submit.ok) { Write-Host $submit.body }

$statusRes = Invoke-JsonRequest -Method "GET" -Url "$base/medhub/certification" -Body $null -Token $userToken
Write-Host "Status HTTP:" $statusRes.status
$certStatus = $null
if ($statusRes.ok) {
  $certStatus = $statusRes.body.certification.status
  Write-Host "Status certificação:" $certStatus
} else {
  Write-Host $statusRes.body
}

$workspaceAfter = Invoke-JsonRequest -Method "GET" -Url "$base/medhub/workspace" -Body $null -Token $userToken
Write-Host "Workspace após submit HTTP:" $workspaceAfter.status
if (-not $workspaceAfter.ok) { Write-Host $workspaceAfter.body }

Write-Host "`n== Teste 3: fluxo admin (listar/atualizar) =="
$adminEmail = "jmsfagundes@gmail.com"
$adminPass = "Qa@123456"
$adminToken = $null

$adminLogin = Invoke-JsonRequest -Method "POST" -Url "$base/auth/login" -Body @{ email = $adminEmail; password = $adminPass }
if ($adminLogin.ok) {
  $adminToken = $adminLogin.body.token
  Write-Host "Admin login OK"
} else {
  Write-Host "Admin login falhou (HTTP $($adminLogin.status)). Tentando registrar admin seed..."
  $adminRegister = Invoke-JsonRequest -Method "POST" -Url "$base/auth/register" -Body @{
    name = "Admin Seed"
    email = $adminEmail
    password = $adminPass
    area = "Admin"
    billingDocument = (New-ValidCpf)
  }
  if ($adminRegister.ok) {
    $adminToken = $adminRegister.body.token
    Write-Host "Admin seed criado com sucesso"
  } else {
    Write-Host "Nao foi possivel obter usuario admin. HTTP $($adminRegister.status)"
    Write-Host $adminRegister.body
  }
}

if ($adminToken) {
  $pending = Invoke-JsonRequest -Method "GET" -Url "$base/medhub/certification/admin/pending" -Body $null -Token $adminToken
  Write-Host "Admin pending HTTP:" $pending.status
  if (-not $pending.ok) { Write-Host $pending.body }

  $reject = Invoke-JsonRequest -Method "PATCH" -Url "$base/medhub/certification/admin/$userId/status" -Body @{ status = "rejected"; rejection_reason = "Teste automatizado" } -Token $adminToken
  Write-Host "Admin reject HTTP:" $reject.status
  if (-not $reject.ok) { Write-Host $reject.body }

  $statusAfterReject = Invoke-JsonRequest -Method "GET" -Url "$base/medhub/certification" -Body $null -Token $userToken
  if ($statusAfterReject.ok) { Write-Host "Status após rejeição:" $statusAfterReject.body.certification.status }

  $approve = Invoke-JsonRequest -Method "PATCH" -Url "$base/medhub/certification/admin/$userId/status" -Body @{ status = "approved" } -Token $adminToken
  Write-Host "Admin approve HTTP:" $approve.status
  if (-not $approve.ok) { Write-Host $approve.body }

  $statusAfterApprove = Invoke-JsonRequest -Method "GET" -Url "$base/medhub/certification" -Body $null -Token $userToken
  if ($statusAfterApprove.ok) { Write-Host "Status após aprovação:" $statusAfterApprove.body.certification.status }
}
