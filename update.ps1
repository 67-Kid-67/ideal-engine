$ErrorActionPreference="Stop"

$root="C:\Downloaded Web Sites\car-soccer.com"
$base="https://car-soccer.com"
$backup="$root\_backup_$(Get-Date -Format yyyyMMdd-HHmmss)"

# ==============================
# BACKUP
# ==============================

New-Item $backup -ItemType Directory -Force | Out-Null

Get-ChildItem $root -Force |
    Where-Object { $_.Name -notlike "_backup_*" } |
    Copy-Item -Destination $backup -Recurse -Force

Write-Host "Backup created:"
Write-Host $backup
Write-Host ""

# ==============================
# DOWNLOAD INDEX
# ==============================

$indexFile="$root\index.html"

Write-Host "Downloading live index..."

curl.exe -L -A "Mozilla/5.0" "$base/" -o $indexFile

if($LASTEXITCODE -ne 0){
    throw "Failed to download index."
}

$index=Get-Content $indexFile -Raw

# ==============================
# QUEUE
# ==============================

$queue=[System.Collections.Generic.Queue[string]]::new()
$seen=[System.Collections.Generic.HashSet[string]]::new()

function Add-Asset {
    param([string]$p)

    if([string]::IsNullOrWhiteSpace($p)){
        return
    }

    $p=$p.Trim()

    $p=$p -replace '^https?://car-soccer\.com/',''
    $p=$p -replace '^/',''
    $p=$p -replace '^\./',''

    # Ignore dynamic JavaScript paths
    if($p -match '\$\{'){
        return
    }

    if($p -match '[<>|]'){
        return
    }

    if($p -notmatch '^assets/'){
        return
    }

    if(!$seen.Contains($p)){
        $queue.Enqueue($p)
    }
}

# ==============================
# FIND ASSETS IN HTML
# ==============================

[regex]::Matches(
    $index,
    'assets/[A-Za-z0-9_./-]+'
) | ForEach-Object {

    Add-Asset $_.Value
}

# ==============================
# DOWNLOAD QUEUE
# ==============================

while($queue.Count){

    $p=$queue.Dequeue()

    if(!$seen.Add($p)){
        continue
    }

    $url="$base/$p"
    $file=Join-Path $root ($p -replace '/','\')

    # Don't write into a directory
    if(Test-Path $file -PathType Container){
        Write-Host "Skipping directory: $p"
        continue
    }

    New-Item (Split-Path $file) -ItemType Directory -Force | Out-Null

    Write-Host "Downloading: $p"

    curl.exe -L -A "Mozilla/5.0" "$url" -o "$file"

    if($LASTEXITCODE -ne 0){
        Write-Host "FAILED: $url"
        continue
    }

    # ==============================
    # SCAN JAVASCRIPT
    # ==============================

    if($p -match '\.js$'){

        $js=Get-Content $file -Raw

        [regex]::Matches(
            $js,
            'assets/[A-Za-z0-9_./-]+'
        ) | ForEach-Object {

            $child=$_.Value

            # Don't download dynamic/template paths
            if($child -notmatch '\$\{'){
                Add-Asset $child
            }
        }
    }
}

# ==============================
# COMPLETE
# ==============================

Write-Host ""
Write-Host "================================"
Write-Host "UPDATE COMPLETE!"
Write-Host "================================"
Write-Host "Backup: $backup"
Write-Host "Assets downloaded: $($seen.Count)"
Write-Host ""
Write-Host "Local copy:"
Write-Host $root