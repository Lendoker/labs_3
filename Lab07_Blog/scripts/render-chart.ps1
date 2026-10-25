param(
  [string]$JsonPath,
  [string]$OutDir
)
Add-Type -AssemblyName System.Drawing
$json = Get-Content -Raw -Encoding UTF8 $JsonPath | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

function Save-BarChart($rows, $labelProp, $valueProp, $title, $fileName) {
  $width = 1000
  $rowH = 36
  $height = 80 + ($rows.Count * $rowH)
  $bmp = New-Object System.Drawing.Bitmap $width, $height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $g.Clear([System.Drawing.Color]::White)
  $titleFont = New-Object System.Drawing.Font "Segoe UI", 16, ([System.Drawing.FontStyle]::Bold)
  $font = New-Object System.Drawing.Font "Segoe UI", 12
  $g.DrawString($title, $titleFont, [System.Drawing.Brushes]::Black, 24, 16)
  $max = 1
  foreach ($row in $rows) { if ([double]$row.$valueProp -gt $max) { $max = [double]$row.$valueProp } }
  $y = 64
  $barLeft = 230
  $barMax = 680
  foreach ($row in $rows) {
    $label = [string]$row.$labelProp
    $value = [double]$row.$valueProp
    $g.DrawString($label, $font, [System.Drawing.Brushes]::Black, 16, $y)
    $len = [Math]::Max(2, [int]($value / $max * $barMax))
    $g.FillRectangle([System.Drawing.Brushes]::SteelBlue, $barLeft, $y, $len, 22)
    $g.DrawString([string]$value, $font, [System.Drawing.Brushes]::Black, ($barLeft + $len + 8), $y)
    $y += $rowH
  }
  $bmp.Save((Join-Path $OutDir $fileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Save-BarChart $json.categories "category_name" "posts_count" $json.categoryTitle "categories.png"
Save-BarChart $json.authors "username" "posts_count" $json.authorTitle "authors.png"
Write-Host "charts ok"
