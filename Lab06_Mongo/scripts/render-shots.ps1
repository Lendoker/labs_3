param(
  [string]$InputFile,
  [string]$OutDir
)
Add-Type -AssemblyName System.Drawing
$raw = [System.IO.File]::ReadAllText($InputFile, [System.Text.Encoding]::UTF8)
$raw = [regex]::Replace($raw, '\x1b\[[0-9;]*[A-Za-z]', '')
$matches = [regex]::Matches($raw, '(?s)##### SHOT ([A-Za-z0-9_\-]+) #####\r?\n(.*?)##### END \1 #####')
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$fontName = "Segoe UI"
function Wrap-Line([string]$line, [int]$width) {
  if ($line.Length -le $width) { return @($line) }
  $chunks = @()
  for ($i = 0; $i -lt $line.Length; $i += $width) {
    $len = [Math]::Min($width, $line.Length - $i)
    $chunks += $line.Substring($i, $len)
  }
  return $chunks
}
foreach ($m in $matches) {
  $name = $m.Groups[1].Value
  $body = $m.Groups[2].Value.TrimEnd()
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("mongosh  library  >  $name")
  $lines.Add(("" + ("-" * 96)))
  foreach ($line in ($body -split '\r?\n')) {
    foreach ($part in (Wrap-Line $line.Replace("`t", "  ") 96)) { $lines.Add($part) }
  }
  $pageSize = 42
  $pages = [Math]::Ceiling($lines.Count / $pageSize)
  for ($p = 0; $p -lt $pages; $p++) {
    $slice = $lines.GetRange($p * $pageSize, [Math]::Min($pageSize, $lines.Count - $p * $pageSize))
    $width = 1180
    $height = 36 + ($slice.Count * 22)
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $g.Clear([System.Drawing.Color]::FromArgb(12, 22, 36))
    $font = New-Object System.Drawing.Font $fontName, 13
    $titleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(130, 255, 190))
    $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(226, 236, 248))
    $y = 12
    for ($i = 0; $i -lt $slice.Count; $i++) {
      $brush = $(if ($i -eq 0) { $titleBrush } else { $textBrush })
      $g.DrawString($slice[$i], $font, $brush, 16, $y)
      $y += 22
    }
    $suffix = $(if ($pages -gt 1) { "-p$($p + 1)" } else { "" })
    $path = Join-Path $OutDir ($name + $suffix + ".png")
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $font.Dispose()
  }
}
Write-Host "shots:" ($matches.Count)
