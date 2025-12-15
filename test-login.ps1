# Test script for login functionality

Write-Host "Testing Archiparse Login Implementation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if services are running
Write-Host "1. Checking Docker services..." -ForegroundColor Yellow
$services = docker ps --filter "name=archiparse" --format "{{.Names}}"
if ($services) {
    Write-Host "   ✓ Services running: $services" -ForegroundColor Green
} else {
    Write-Host "   ✗ No services found. Starting services..." -ForegroundColor Red
    docker compose -f docker-compose.alt.yml up -d
    Start-Sleep -Seconds 5
}

# Test backend API
Write-Host ""
Write-Host "2. Testing backend login API..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"admin@example.com","password":"admin123"}' `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    if ($loginData.access_token) {
        Write-Host "   ✓ Login API working - Token received" -ForegroundColor Green
        Write-Host "   Token: $($loginData.access_token.Substring(0, 20))..." -ForegroundColor Gray
        
        # Test /auth/me endpoint
        $headers = @{
            "Authorization" = "Bearer $($loginData.access_token)"
        }
        $meResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/me" `
            -Method GET `
            -Headers $headers `
            -UseBasicParsing `
            -ErrorAction Stop
        $userData = $meResponse.Content | ConvertFrom-Json
        Write-Host "   ✓ User info retrieved: $($userData.email)" -ForegroundColor Green
    } else {
        Write-Host "   ✗ No token in response" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Backend API error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test frontend
Write-Host ""
Write-Host "3. Testing frontend..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3001/login" `
        -Method GET `
        -UseBasicParsing `
        -ErrorAction Stop
    
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "   ✓ Frontend accessible (Status: $($frontendResponse.StatusCode))" -ForegroundColor Green
        
        # Check if login page content is present
        if ($frontendResponse.Content -match "Connexion|Login") {
            Write-Host "   ✓ Login page content found" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ Login page content not found in response" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ✗ Frontend returned status: $($frontendResponse.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Frontend error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure frontend is running on port 3001" -ForegroundColor Yellow
}

# Check Zustand installation
Write-Host ""
Write-Host "4. Checking Zustand installation..." -ForegroundColor Yellow
if (Test-Path "frontend/node_modules/zustand") {
    Write-Host "   ✓ Zustand installed" -ForegroundColor Green
} else {
    Write-Host "   ✗ Zustand not found. Run: cd frontend && npm install" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3001/login in your browser" -ForegroundColor White
Write-Host "2. Login with: admin@example.com / admin123" -ForegroundColor White
Write-Host "3. Check browser console for any errors" -ForegroundColor White


