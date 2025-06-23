# Apply all the fixed API routes
Move-Item -Path "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\route.ts.new" -Destination "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\route.ts" -Force
Move-Item -Path "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\strategies\route.ts.new" -Destination "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\strategies\route.ts" -Force
Move-Item -Path "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\trading-pairs\route.ts.new" -Destination "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\trading-pairs\route.ts" -Force
Move-Item -Path "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\[id]\toggle-active\route.ts.new" -Destination "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\[id]\toggle-active\route.ts" -Force
Move-Item -Path "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\[id]\toggle-ai\route.ts.new" -Destination "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\[id]\toggle-ai\route.ts" -Force
Move-Item -Path "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\[id]\toggle-ai-trading\route.ts.new" -Destination "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\[id]\toggle-ai-trading\route.ts" -Force
Move-Item -Path "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\[id]\evaluate\route.ts.new" -Destination "d:\trade-tracker-v2.1\the-trade-tracker-v2.0\frontend\src\app\api\bots\[id]\evaluate\route.ts" -Force

Write-Host "All API routes have been updated with consistent authentication patterns."
