const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');

/**
 * Converts HTTP Observatory scan results to SARIF format
 * @param {string} host - The scanned host
 * @param {object} scanResults - The scan results from HTTP Observatory
 * @returns {object} SARIF formatted results
 */
function convertToSARIF(host, scanResults) {
  const sarif = {
    version: '2.1.0',
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'MDN HTTP Observatory',
            informationUri: 'https://developer.mozilla.org/en-US/observatory',
            version: '1.0.0',
            rules: []
          }
        },
        results: [],
        invocations: [
          {
            executionSuccessful: true,
            endTimeUtc: new Date().toISOString()
          }
        ],
        properties: {
          host: host,
          scanDate: new Date().toISOString()
        }
      }
    ]
  };

  // Parse the scan results and convert to SARIF results
  if (scanResults && scanResults.tests) {
    Object.entries(scanResults.tests).forEach(([testName, testResult]) => {
      const ruleId = `observatory/${testName}`;
      
      // Add rule definition
      const rule = {
        id: ruleId,
        name: testName,
        shortDescription: {
          text: testResult.score_description || testName
        },
        fullDescription: {
          text: testResult.score_description || testName
        },
        help: {
          text: testResult.recommendation || `No recommendation available. See https://developer.mozilla.org/en-US/observatory/analyze?host=${host} for details.`
        },
        properties: {
          tags: ['security', 'http-headers']
        }
      };
      
      // Determine severity based on result
      let level = 'note';
      if (testResult.pass === false) {
        if (testResult.score_modifier < -10) {
          level = 'error';
        } else if (testResult.score_modifier < 0) {
          level = 'warning';
        }
      } else if (testResult.pass === true) {
        level = 'none';
      }
      
      rule.defaultConfiguration = {
        level: level === 'none' ? 'note' : level
      };
      
      sarif.runs[0].tool.driver.rules.push(rule);
      
      // Only add results for failures or warnings
      if (level !== 'none') {
        // Determine the scanned URL for display in the message
        const scannedUrl = host.startsWith('http://') || host.startsWith('https://') 
          ? host 
          : `https://${host}/`;
        
        const result = {
          ruleId: ruleId,
          level: level,
          message: {
            text: `${testResult.result} ${testResult.score_modifier} [${scannedUrl}] ${testResult.score_description || testName}`
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  // Use a relative file path for GitHub Code Scanning compatibility
                  uri: 'package.json'
                },
                region: {
                  startLine: 1,
                  startColumn: 1
                }
              }
            }
          ],
          properties: {
            pass: testResult.pass,
            score_modifier: testResult.score_modifier,
            scannedUrl: scannedUrl
          }
        };
        
        sarif.runs[0].results.push(result);
      }
    });
  }
  
  // Add overall score as a property
  if (scanResults && scanResults.scan) {
    sarif.runs[0].properties.score = scanResults.scan.score;
    sarif.runs[0].properties.grade = scanResults.scan.grade;
    sarif.runs[0].properties.likelihood_indicator = scanResults.scan.likelihood_indicator;
  }

  console.log(sarif);
  
  return sarif;
}

/**
 * Main action entry point
 */
async function run() {
  try {
    // Get inputs
    const host = core.getInput('host', { required: true });
    const outputFile = core.getInput('output-file') || 'observatory-results.sarif';
    
    core.info(`Scanning host: ${host}`);
    
    // Run HTTP Observatory scan
    let scanOutput = '';
    let scanError = '';
    
    const options = {
      listeners: {
        stdout: (data) => {
          scanOutput += data.toString();
        },
        stderr: (data) => {
          scanError += data.toString();
        }
      },
      ignoreReturnCode: true
    };
    
    const exitCode = await exec.exec(
      'npx',
      ['--yes', '@mdn/mdn-http-observatory', host],
      options
    );
    
    if (exitCode !== 0) {
      core.warning(`Observatory scan exited with code ${exitCode}`);
      core.warning(`Error output: ${scanError}`);
    }
    
    core.info('Scan completed, parsing results...');
    
    // Parse JSON output
    let scanResults;
    try {
      // The output may contain npm warnings before the JSON, so we need to extract it
      const jsonMatch = scanOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scanResults = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON output found in scan results');
      }
    } catch (error) {
      core.error('Failed to parse scan results as JSON');
      core.error(`Output: ${scanOutput}`);
      throw error;
    }
    
    // Convert to SARIF
    core.info('Converting to SARIF...');
    const sarifOutput = convertToSARIF(host, scanResults);
    
    // Write SARIF file
    core.info(`Writing SARIF output to ${outputFile}...`);
    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(sarifOutput, null, 2));
    
    core.info(`SARIF file written to: ${outputPath}`);
    core.setOutput('sarif-file', outputPath);
    
    // Log summary
    if (scanResults && scanResults.scan) {
      core.summary
        .addHeading(`HTTP Observatory Scan Results for ${host}`)
        .addTable([
          [{ data: 'Score', header: true }, { data: 'Grade', header: true }, { data: 'Tests', header: true }],
          [
            scanResults.scan.score?.toString() || 'N/A',
            scanResults.scan.grade || 'N/A',
            Object.keys(scanResults.tests || {}).length.toString()
          ]
        ]);
      
      await core.summary.write();
    }
    
    core.info('Scan complete!');
    
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
