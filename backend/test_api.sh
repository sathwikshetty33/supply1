#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Supply Chain API Test Suite${NC}"
echo -e "${BLUE}================================${NC}\n"

BASE_URL="http://localhost:8001"

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
response=$(curl -s $BASE_URL/)
if echo "$response" | grep -q "Supply Chain Management API"; then
    echo -e "${GREEN}✓ Health check passed${NC}\n"
else
    echo -e "${RED}✗ Health check failed${NC}\n"
    exit 1
fi

# Test 2: Register Farmer
echo -e "${BLUE}Test 2: Register Farmer${NC}"
response=$(curl -s -X POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_farmer",
    "password": "farmer123",
    "role": "farmer",
    "contact": "+911234567890",
    "location": "Punjab",
    "language": "Punjabi"
  }')
if echo "$response" | grep -q "test_farmer"; then
    echo -e "${GREEN}✓ Farmer registration successful${NC}"
    echo "$response" | python -m json.tool
    echo ""
else
    echo -e "${RED}✗ Farmer registration failed${NC}"
    echo "$response"
    echo ""
fi

# Test 3: Register Mandi Owner
echo -e "${BLUE}Test 3: Register Mandi Owner${NC}"
response=$(curl -s -X POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_mandi",
    "password": "mandi123",
    "role": "mandi_owner",
    "contact": "+919876543210",
    "location": "Amritsar"
  }')
if echo "$response" | grep -q "test_mandi"; then
    echo -e "${GREEN}✓ Mandi owner registration successful${NC}"
    echo "$response" | python -m json.tool
    echo ""
else
    echo -e "${RED}✗ Mandi owner registration failed${NC}"
    echo "$response"
    echo ""
fi

# Test 4: Register Retailer
echo -e "${BLUE}Test 4: Register Retailer${NC}"
response=$(curl -s -X POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_retailer",
    "password": "retail123",
    "role": "retailer",
    "contact": "+918765432109",
    "location": "Delhi"
  }')
if echo "$response" | grep -q "test_retailer"; then
    echo -e "${GREEN}✓ Retailer registration successful${NC}"
    echo "$response" | python -m json.tool
    echo ""
else
    echo -e "${RED}✗ Retailer registration failed${NC}"
    echo "$response"
    echo ""
fi

# Test 5: Login Farmer
echo -e "${BLUE}Test 5: Login Farmer${NC}"
response=$(curl -s -X POST $BASE_URL/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_farmer",
    "password": "farmer123"
  }')
if echo "$response" | grep -q "access_token"; then
    echo -e "${GREEN}✓ Farmer login successful${NC}"
    echo "$response" | python -m json.tool
    farmer_token=$(echo "$response" | python -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
    echo ""
else
    echo -e "${RED}✗ Farmer login failed${NC}"
    echo "$response"
    echo ""
fi

# Test 6: Login with Wrong Password
echo -e "${BLUE}Test 6: Login with Wrong Password (Should Fail)${NC}"
response=$(curl -s -X POST $BASE_URL/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_farmer",
    "password": "wrongpassword"
  }')
if echo "$response" | grep -q "Invalid username or password"; then
    echo -e "${GREEN}✓ Wrong password correctly rejected${NC}"
    echo "$response" | python -m json.tool
    echo ""
else
    echo -e "${RED}✗ Security issue: Wrong password not rejected${NC}"
    echo "$response"
    echo ""
fi

# Test 7: Duplicate Username
echo -e "${BLUE}Test 7: Duplicate Username Registration (Should Fail)${NC}"
response=$(curl -s -X POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_farmer",
    "password": "newpass123",
    "role": "farmer",
    "contact": "+919999999999"
  }')
if echo "$response" | grep -q "already registered"; then
    echo -e "${GREEN}✓ Duplicate username correctly rejected${NC}"
    echo "$response" | python -m json.tool
    echo ""
else
    echo -e "${RED}✗ Duplicate username not rejected${NC}"
    echo "$response"
    echo ""
fi

# Test 8: Invalid Role
echo -e "${BLUE}Test 8: Invalid Role Registration (Should Fail)${NC}"
response=$(curl -s -X POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_invalid",
    "password": "test123",
    "role": "invalid_role",
    "contact": "+919999999999"
  }')
if echo "$response" | grep -q "detail"; then
    echo -e "${GREEN}✓ Invalid role correctly rejected${NC}"
    echo "$response" | python -m json.tool
    echo ""
else
    echo -e "${RED}✗ Invalid role not rejected${NC}"
    echo "$response"
    echo ""
fi

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Test Suite Completed!${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "\n${BLUE}Database Status:${NC}"
sudo -u postgres psql -d supply_chain_db -c "SELECT COUNT(*) as total_users FROM users;" 2>&1 | grep -A 1 "total_users"
echo ""
