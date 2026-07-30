$base = "https://land-degradation-neutrality.vercel.app"

Write-Host "Checking /api/ldn..."
try {
  $r = Invoke-WebRequest -Uri "$base/api/ldn" -UseBasicParsing -TimeoutSec 30
  $j = $r.Content | ConvertFrom-Json
  Write-Host ("LDN  -> source=" + $j.source + "  count=" + $j.count)
} catch {
  Write-Host ("LDN  -> ERROR: " + $_.Exception.Message)
}

Write-Host "Checking /api/soil..."
try {
  $r = Invoke-WebRequest -Uri "$base/api/soil" -UseBasicParsing -TimeoutSec 30
  $j = $r.Content | ConvertFrom-Json
  Write-Host ("SOIL -> source=" + $j.source + "  count=" + $j.count)
} catch {
  Write-Host ("SOIL -> ERROR: " + $_.Exception.Message)
}

Write-Host "Checking /api/drylands..."
try {
  $r = Invoke-WebRequest -Uri "$base/api/drylands" -UseBasicParsing -TimeoutSec 30
  $j = $r.Content | ConvertFrom-Json
  Write-Host ("DRYL -> source=" + $j.source + "  count=" + $j.count)
} catch {
  Write-Host ("DRYL -> ERROR: " + $_.Exception.Message)
}
