#!/usr/bin/env python3
"""
Backend API Testing for Multi-Tenant ERP System
Tests authentication and sector-specific APIs for all business types
"""

import requests
import json
import sys
from typing import Dict, List, Optional

# Backend URL from frontend/.env
BASE_URL = "https://saas-erp-hub.preview.emergentagent.com/api"

# Test credentials for different sectors
TEST_CREDENTIALS = {
    "clinic": {"email": "clinic@example.com", "password": "clinic123"},
    "pharmacy": {"email": "pharmacy@example.com", "password": "pharmacy123"},
    "garage": {"email": "garage@example.com", "password": "garage123"},
    "fashion": {"email": "fashion@example.com", "password": "fashion123"},
    "real_estate": {"email": "realestate@example.com", "password": "realestate123"},
    "electronics": {"email": "electronics@example.com", "password": "electronics123"},
    "stationery": {"email": "stationery@example.com", "password": "stationery123"},
    "furniture": {"email": "furniture@example.com", "password": "furniture123"},
    "wholesale": {"email": "wholesale@example.com", "password": "wholesale123"},
    "ecommerce": {"email": "ecommerce@example.com", "password": "ecommerce123"}
}

class ERPTester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, message: str, sector: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        sector_info = f"[{sector.upper()}]" if sector else ""
        print(f"{status} {sector_info} {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "sector": sector,
            "success": success,
            "message": message
        })
    
    def test_login(self, sector: str, credentials: Dict[str, str]) -> Optional[str]:
        """Test login for a specific sector"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                json=credentials,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                user = data.get("user", {})
                business_type = user.get("business_type")
                
                if token:
                    self.tokens[sector] = token
                    self.log_result(
                        "Login Authentication", 
                        True, 
                        f"Successfully logged in. Business type: {business_type}", 
                        sector
                    )
                    return token
                else:
                    self.log_result("Login Authentication", False, "No access token in response", sector)
                    return None
            else:
                self.log_result(
                    "Login Authentication", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}", 
                    sector
                )
                return None
                
        except Exception as e:
            self.log_result("Login Authentication", False, f"Exception: {str(e)}", sector)
            return None
    
    def test_api_endpoint(self, sector: str, endpoint: str, method: str = "GET", data: Dict = None) -> bool:
        """Test a specific API endpoint"""
        token = self.tokens.get(sector)
        if not token:
            self.log_result(f"API {endpoint}", False, "No authentication token available", sector)
            return False
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        try:
            if method == "GET":
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
            elif method == "POST":
                response = self.session.post(f"{BASE_URL}{endpoint}", headers=headers, json=data)
            else:
                self.log_result(f"API {endpoint}", False, f"Unsupported method: {method}", sector)
                return False
            
            if response.status_code in [200, 201]:
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        self.log_result(
                            f"API {endpoint}", 
                            True, 
                            f"Returned {len(response_data)} items", 
                            sector
                        )
                    else:
                        self.log_result(f"API {endpoint}", True, "Valid response received", sector)
                    return True
                except json.JSONDecodeError:
                    self.log_result(f"API {endpoint}", True, "Non-JSON response (possibly valid)", sector)
                    return True
            else:
                self.log_result(
                    f"API {endpoint}", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}", 
                    sector
                )
                return False
                
        except Exception as e:
            self.log_result(f"API {endpoint}", False, f"Exception: {str(e)}", sector)
            return False
    
    def test_core_apis(self, sector: str):
        """Test core APIs that should work for any tenant"""
        core_endpoints = [
            "/products",
            "/sales", 
            "/customers",
            "/dashboard/stats"
        ]
        
        for endpoint in core_endpoints:
            self.test_api_endpoint(sector, endpoint)
    
    def test_sector_specific_apis(self, sector: str):
        """Test sector-specific APIs based on business type"""
        sector_apis = {
            "clinic": ["/doctors", "/patients"],
            "garage": ["/vehicles"],
            "real_estate": ["/properties"],
            "electronics": ["/warranties", "/returns"],
            "stationery": ["/books"],
            "furniture": ["/custom-orders"],
            "wholesale": ["/purchase-orders", "/goods-receipts"],
            "ecommerce": ["/online-orders"],
            "fashion": ["/product-variants", "/offers"]
        }
        
        endpoints = sector_apis.get(sector, [])
        for endpoint in endpoints:
            self.test_api_endpoint(sector, endpoint)
    
    def run_comprehensive_test(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Multi-Tenant ERP Backend API Tests")
        print("=" * 60)
        
        # Test 1: Authentication for all sectors
        print("\n📋 Testing Authentication APIs...")
        for sector, credentials in TEST_CREDENTIALS.items():
            self.test_login(sector, credentials)
        
        # Test 2: Core APIs for authenticated sectors
        print("\n📋 Testing Core APIs...")
        for sector in self.tokens.keys():
            print(f"\n--- Testing Core APIs for {sector.upper()} ---")
            self.test_core_apis(sector)
        
        # Test 3: Sector-specific APIs
        print("\n📋 Testing Sector-Specific APIs...")
        for sector in self.tokens.keys():
            print(f"\n--- Testing {sector.upper()}-specific APIs ---")
            self.test_sector_specific_apis(sector)
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        # Group failures by sector
        failures_by_sector = {}
        for result in self.test_results:
            if not result["success"]:
                sector = result["sector"] or "general"
                if sector not in failures_by_sector:
                    failures_by_sector[sector] = []
                failures_by_sector[sector].append(result)
        
        if failures_by_sector:
            print("\n🔍 FAILED TESTS BY SECTOR:")
            for sector, failures in failures_by_sector.items():
                print(f"\n{sector.upper()}:")
                for failure in failures:
                    print(f"  ❌ {failure['test']}: {failure['message']}")
        
        # Authentication summary
        auth_success = len([r for r in self.test_results if r["test"] == "Login Authentication" and r["success"]])
        auth_total = len([r for r in self.test_results if r["test"] == "Login Authentication"])
        print(f"\n🔐 Authentication Success: {auth_success}/{auth_total} sectors")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = ERPTester()
    success = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)