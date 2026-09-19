# ShikshaMesh MCP tools

`createShikshaMeshMcpServer(actor)` exposes actor-bound MCP tools for authorized course search and policy-gated official research. A production HTTP/stdio transport must authenticate the Cognito user before creating the server; actor IDs are intentionally not accepted as tool parameters.

`quiz_workflow_start` is available only to a trusted actor with the `teacher` or `admin` role. It validates class membership and requires `confirmed: true`; this is the required human-approval boundary before the tool may start Step Functions.
