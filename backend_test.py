import requests
import sys
import json
from datetime import datetime

class ArcoliaAPITester:
    def __init__(self, base_url="https://page-builder-225.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.verification_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_signup(self, username, email, password):
        """Test user signup"""
        success, response = self.run_test(
            "User Signup",
            "POST",
            "api/auth/signup",
            200,
            data={"username": username, "email": email, "password": password}
        )
        if success and 'verification_token' in response:
            self.verification_token = response['verification_token']
            print(f"   Verification token saved: {self.verification_token}")
        return success

    def test_signup_duplicate_email(self, username, email, password):
        """Test signup with duplicate email (should fail)"""
        success, response = self.run_test(
            "Signup with Duplicate Email (should fail)",
            "POST",
            "api/auth/signup",
            400,
            data={"username": username, "email": email, "password": password}
        )
        return success

    def test_signup_duplicate_username(self, username, email, password):
        """Test signup with duplicate username (should fail)"""
        success, response = self.run_test(
            "Signup with Duplicate Username (should fail)",
            "POST",
            "api/auth/signup",
            400,
            data={"username": username, "email": email, "password": password}
        )
        return success

    def test_verify_email(self, token):
        """Test email verification"""
        success, response = self.run_test(
            "Email Verification",
            "POST",
            "api/auth/verify-email",
            200,
            data={"token": token}
        )
        return success

    def test_verify_email_invalid_token(self):
        """Test email verification with invalid token (should fail)"""
        success, response = self.run_test(
            "Email Verification with Invalid Token (should fail)",
            "POST",
            "api/auth/verify-email",
            400,
            data={"token": "invalid_token_123"}
        )
        return success

    def test_login_unverified(self, email, password):
        """Test login with unverified email (should fail)"""
        success, response = self.run_test(
            "Login with Unverified Email (should fail)",
            "POST",
            "api/auth/login",
            403,
            data={"email": email, "password": password}
        )
        return success

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response.get('user', {})
            print(f"   Token saved: {self.token[:20]}...")
            print(f"   User data: {json.dumps(self.user_data, indent=2)}")
        return success

    def test_login_invalid_credentials(self, email, password):
        """Test login with invalid credentials (should fail)"""
        success, response = self.run_test(
            "Login with Invalid Credentials (should fail)",
            "POST",
            "api/auth/login",
            401,
            data={"email": email, "password": password}
        )
        return success

    def test_get_me(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User Info",
            "GET",
            "api/auth/me",
            200
        )
        return success

    def test_get_me_no_auth(self):
        """Test get current user info without auth (should fail)"""
        old_token = self.token
        self.token = None
        success, response = self.run_test(
            "Get Current User Info without Auth (should fail)",
            "GET",
            "api/auth/me",
            401
        )
        self.token = old_token
        return success

    def test_link_wallet(self, wallet_address):
        """Test wallet linking"""
        success, response = self.run_test(
            "Link Wallet",
            "POST",
            "api/auth/link-wallet",
            200,
            data={"wallet_address": wallet_address}
        )
        return success

    def test_link_wallet_invalid_format(self):
        """Test wallet linking with invalid format (should fail)"""
        success, response = self.run_test(
            "Link Wallet with Invalid Format (should fail)",
            "POST",
            "api/auth/link-wallet",
            400,
            data={"wallet_address": "invalid_wallet"}
        )
        return success

    def test_unlink_wallet(self):
        """Test wallet unlinking"""
        success, response = self.run_test(
            "Unlink Wallet",
            "POST",
            "api/auth/unlink-wallet",
            200
        )
        return success

def main():
    print("🚀 Starting Arcolia API Tests")
    print("=" * 50)
    
    tester = ArcoliaAPITester()
    
    # Generate unique test data
    timestamp = datetime.now().strftime('%H%M%S')
    test_username = f"testuser{timestamp}"
    test_email = f"test{timestamp}@example.com"
    test_password = "TestPass123!"
    test_wallet = "0x742d35Cc6634C0532925a3b8D404d3aAB8c3f1e2"

    print(f"Test user: {test_username}")
    print(f"Test email: {test_email}")
    
    # Test sequence
    tests_to_run = [
        # Basic health check
        ("Health Check", lambda: tester.test_health_check()),
        
        # Signup flow
        ("User Signup", lambda: tester.test_signup(test_username, test_email, test_password)),
        ("Duplicate Email Signup", lambda: tester.test_signup_duplicate_email(f"another{timestamp}", test_email, test_password)),
        ("Duplicate Username Signup", lambda: tester.test_signup_duplicate_username(test_username, f"another{timestamp}@example.com", test_password)),
        
        # Email verification
        ("Invalid Token Verification", lambda: tester.test_verify_email_invalid_token()),
        ("Login Before Verification", lambda: tester.test_login_unverified(test_email, test_password)),
        ("Email Verification", lambda: tester.test_verify_email(tester.verification_token) if tester.verification_token else False),
        
        # Login flow
        ("Invalid Credentials Login", lambda: tester.test_login_invalid_credentials(test_email, "wrongpassword")),
        ("Valid Login", lambda: tester.test_login(test_email, test_password)),
        
        # Authenticated endpoints
        ("Get User Info", lambda: tester.test_get_me()),
        ("Get User Info No Auth", lambda: tester.test_get_me_no_auth()),
        
        # Wallet operations
        ("Link Invalid Wallet", lambda: tester.test_link_wallet_invalid_format()),
        ("Link Valid Wallet", lambda: tester.test_link_wallet(test_wallet)),
        ("Unlink Wallet", lambda: tester.test_unlink_wallet()),
    ]
    
    # Run all tests
    for test_name, test_func in tests_to_run:
        try:
            result = test_func()
            if not result:
                print(f"⚠️  Test '{test_name}' failed but continuing...")
        except Exception as e:
            print(f"💥 Test '{test_name}' crashed: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())