$filePath = "src\components\dashboard\setup-guide.tsx"
$content = Get-Content -Path $filePath -Raw

# Create a backup
Copy-Item -Path $filePath -Destination "$filePath.backup"

# Fix the insert method syntax
$pattern = '\.insert\(\[\{([\s\S]*?)\}\)'
$replacement = '.insert([{$1}])'
$newContent = [regex]::Replace($content, $pattern, $replacement)

# Save the fixed content
Set-Content -Path $filePath -Value $newContent

Write-Host "Fixed Supabase insert methods in $filePath"
