$filePath = "src\components\dashboard\setup-guide.tsx"
$content = Get-Content -Path $filePath -Raw

# Create a backup
Copy-Item -Path $filePath -Destination "$filePath.backup"

# Fix the insert method syntax by adding the closing bracket for the array
$content = $content -replace '\.insert\(\[\{([\s\S]*?)\}\)\s*\.select', '.insert([{$1}]).select'

# Remove any literal newline characters
$content = $content -replace '\\n', ''

# Save the fixed content
Set-Content -Path $filePath -Value $content

Write-Host "Fixed Supabase insert methods in $filePath"
