### **1. Header Section**

*   **Overall Purpose:** This file contains the integration tests for the Staff API endpoints. Its primary purpose is to verify that the API endpoints related to staff management function correctly in a production-like environment, interacting with a real database. It validates the data contract (request and response shapes) and business logic of the staff roster endpoint.

*   **End-to-End Data Flow:** The test is executed by the `tests/run_integration_tests.js` script. This runner first starts the entire backend server as a separate "black-box" process on a dedicated test port (3001). Once the server is fully initialized, the test script uses the `supertest` library to make a real HTTP `GET` request to the `http://localhost:3001/api/staff/roster` endpoint. The backend server receives this request, routes it to the staff controller, which in turn queries the live test database for the list of active staff. The server then serializes the database rows into a JSON array and sends it back as the HTTP response. The test script receives this response, asserts that the status code is 200, and validates that the structure of the JSON payload matches the expected data contract (e.g., it's an array, objects have `id` and `masseuse_name` properties). Finally, the runner script terminates the server process.

### **2. Module API & Logic Breakdown**

*   **`describe('Staff API Endpoint Integration Tests')`**
    *   **Purpose:** To group all integration tests related to the Staff API.
    *   **Logic Notes:** This is the main test suite for staff-related API endpoints.

*   **`describe('GET /api/staff/roster')`**
    *   **Purpose:** To test the functionality of the staff roster endpoint specifically.
    *   **`it('should successfully fetch the active staff roster...')`**
        *   **Purpose:** To verify the success path of the roster endpoint.
        *   **Logic:**
            1.  Makes a `GET` request to `/api/staff/roster`.
            2.  Asserts the HTTP status code is `200`.
            3.  Asserts the response body is an array and is not empty.
            4.  Asserts that the first object in the array has the required properties (`id`, `masseuse_name`, `status`), confirming the API's data contract.

### **3. Dependency Mapping**

*   **Upstream Dependencies (Inputs):**
    *   **Calling Modules/Services:** `tests/run_integration_tests.js` (This script orchestrates the test execution).
    *   **Input Data Contracts / Schemas:** None. The `GET` request has no body.

*   **Downstream Dependencies (Outputs):**
    *   **Called Modules/Services:** Makes an HTTP request to the running `backend/server.js` application, which in turn calls `backend/models/database.js`.
    *   **Output Data Contracts / Schemas:** Expects a JSON response with the following structure:
        ```json
        [
          {
            "id": "number",
            "masseuse_name": "string",
            "status": "string"
          },
          ...
        ]
        ```

### **4. Bug & Resolution History**

*   **Bug 1: `SQLITE_MISUSE: Database handle is closed` & `EADDRINUSE` Port Conflict**
    *   **Bug Summary:** The initial test setup caused a race condition. Requiring `server.js` made it auto-start, while the test's `beforeAll` hook tried to start it again, leading to a port conflict. The `afterAll` hook would then close the database connection while the first server instance was still initializing, causing the database misuse error.
    *   **Validated Hypothesis:** The root cause was the dual-server startup and improper lifecycle management within the test file itself. The test and the server were too tightly coupled.
    *   **Resolution:** The architecture was refactored for testability:
        1.  **Server Decoupling:** `backend/server.js` was modified to only auto-start when run directly (`require.main === module`). It now exports `startServer` and `closeServer` functions for programmatic control.
        2.  **External Test Runner:** A new script, `tests/run_integration_tests.js`, was created. This script treats the server as a true "black box," spawning it as a separate child process, waiting for a "ready" signal, running the Jest tests against it, and then killing the process. This completely decoupled the test from the server's lifecycle.

*   **Bug 2: "Jest did not exit" & Zombie Processes Locking Port**
    *   **Bug Summary:** Even with the new runner, Jest would sometimes hang, and a "zombie" server process from a failed or interrupted test run would remain, holding onto the test port and causing subsequent runs to fail with `EADDRINUSE`.
    *   **Validated Hypothesis:** The standard `process.kill()` command in the runner's cleanup phase was not reliably terminating the entire process group spawned by the server.
    *   **Resolution:** The test runner's `stopServer` function was made significantly more robust. Before starting a new test run, it now performs an aggressive cleanup:
        1.  It attempts to kill the server process group.
        2.  It then **guarantees** the port is free by executing `lsof -t -i:<PORT>` to find the PID of any process squatting on the port.
        3.  If a PID is found, it executes `kill -9 <pid>` to forcibly terminate it. This ensures a clean slate for every single test run.

*   **Bug 3: Data Contract Mismatch in Test Assertion**
    *   **Bug Summary:** The test failed because it was asserting that staff objects in the response should have a `name` property.
    *   **Validated Hypothesis:** The API was actually returning `masseuse_name`, not `name`. The test's expectation was incorrect.
    *   **Resolution:** The assertion in `tests/integration/staff.spec.js` was corrected from `expect(firstStaffMember).toHaveProperty('name')` to `expect(firstStaffMember).toHaveProperty('masseuse_name')`.
