# Fix Workflow Tool Call Issues
# This script replaces tool._call() with tool.invoke() in workflow files

Write-Host "🔧 Fixing workflow tool call issues..." -ForegroundColor Yellow

$workflowFiles = @(
    "agents/workflows/emergency-sync-workflow.ts",
    "agents/workflows/risk-check-workflow.ts"
)

foreach ($file in $workflowFiles) {
    if (Test-Path $file) {
        Write-Host "   Fixing: $file" -ForegroundColor Cyan

        # Read file content
        $content = Get-Content $file -Raw

        # Replace tool._call( with tool.invoke(JSON.stringify(
        $content = $content -replace '(\w+Tool)\._call\(', '$1.invoke(JSON.stringify('

        # Add closing parenthesis for JSON.stringify
        $content = $content -replace '\}\)\)', '})))'

        # Write back to file
        Set-Content -Path $file -Value $content -Encoding UTF8

        Write-Host "   ✅ Fixed tool calls in: $file" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`n✨ Workflow tool call fixes complete!" -ForegroundColor Green
