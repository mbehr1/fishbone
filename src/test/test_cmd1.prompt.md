---
mode: 'agent'
model: GPT-4o
tools: []
fai.extends: ['analyse', 'non-existing']
description: 'Test command 1 for own prompts'
---
Your goal is to analyse flash failures based on the provided logs and fishbone files. 

When you receive a request, follow these steps:
  1. Check for any crashes or system crashes in the logs.
  2. Check all error logs from application 'LSMF' via filter:
  ```JSON
  {
    "apid":"LSMF",
    "loglevelMax":2
  }
  ```

Always provide a detailed summary of your findings, including:
  - The nature of the flash failure.
  - Any patterns or commonalities in the logs.
  - Recommendations for further investigation or actions to take.

// only for testing purposes:
End of test_cmd1.prompt.md
