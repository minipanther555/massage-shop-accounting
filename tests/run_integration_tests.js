const { spawn } = require('child_process');
const http = require('http');
const jest = require('jest');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const PORT = 3001; // Use a dedicated port for testing to avoid conflicts
process.env.PORT = PORT;
process.env.NODE_ENV = 'testing';

let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting backend server for integration tests...');
    
    // Use spawn to run the server as a completely separate process
    serverProcess = spawn('node', ['backend/server.js'], {
      env: process.env, // Pass environment variables
      detached: true, // Allows us to kill the process group
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[SERVER LOG]: ${data}`);
      if (data.toString().includes('SERVER IS FULLY INITIALIZED')) {
        console.log('✅ Server is ready.');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[SERVER ERROR]: ${data}`);
    });

    serverProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Server process exited with code ${code}`));
      }
    });
  });
}

async function stopServer() {
  if (serverProcess) {
    console.log('🛑 Stopping backend server...');
    try {
      // Use process group killing, which is more reliable for child processes
      process.kill(-serverProcess.pid, 'SIGKILL');
      console.log('✅ Server process group terminated.');
    } catch (e) {
      console.warn('Could not kill server process group, it may have already exited.', e.message);
    }
  }
  
  // GUARANTEE the port is free by finding and killing any listener
  try {
    console.log(`🧹 Ensuring port ${PORT} is free...`);
    // Use lsof to find the PID and then kill it. This is a robust cleanup step.
    const { stdout } = await exec(`lsof -t -i:${PORT}`);
    const pid = stdout.trim();
    if (pid) {
      console.log(`🔪 Found zombie process ${pid} on port ${PORT}. Terminating...`);
      await exec(`kill -9 ${pid}`);
      console.log(`✅ Port ${PORT} has been cleared.`);
    }
  } catch (error) {
    // This is expected if nothing is running on the port
    console.log(`👍 Port ${PORT} is already clear.`);
  }
}

async function runTests() {
  const jestArgs = process.argv.slice(2); // Get all arguments passed to this script
  console.log(`🏃‍♂️ Running Jest tests with args: ${jestArgs.join(' ') || 'all tests'}`);

  try {
    await stopServer(); // Ensure port is clear before starting
    await startServer();

    const { results } = await jest.runCLI({
      roots: ['<rootDir>/tests/integration'],
      verbose: true,
      // Pass the arguments directly to Jest
      _: jestArgs,
    }, [process.cwd()]);

    if (results.numFailedTests > 0) {
      throw new Error('Jest tests failed.');
    }

    console.log('✅ Jest tests passed.');
  } catch (error) {
    console.error('🔥 Integration test run failed:', error.message);
    process.exit(1);
  } finally {
    await stopServer();
  }
}

runTests();
