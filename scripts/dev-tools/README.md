# Dev Tools

## Server Management Script

The `server.sh` script manages the development and production web servers with background process management, logging, and PID tracking.

### Usage

```bash
./scripts/dev-tools/server.sh {start|stop|restart|status} [environment]
```

### Commands

- **start** - Start the server (automatically restarts if already running)
- **stop** - Stop the server gracefully
- **restart** - Stop and start the server
- **status** - Show server status and recent logs

### Environments

- **dev** (default) - Runs `npm run dev`
- **prod** - Runs `npm run start`

### Examples

```bash
# Start development server
./scripts/dev-tools/server.sh start

# Start production server
./scripts/dev-tools/server.sh start prod

# Restart development server
./scripts/dev-tools/server.sh restart

# Check server status
./scripts/dev-tools/server.sh status

# Stop server
./scripts/dev-tools/server.sh stop
```

### File Locations

- **PID files**: `var/run/server-{env}.pid`
- **Log files**: `var/logs/node/{env}.log`

### Viewing Logs

```bash
# Tail development logs
tail -f var/logs/node/dev.log

# Tail production logs
tail -f var/logs/node/prod.log
```

### Notes

- The `var/` directory is gitignored
- Logs are appended to the log file (not overwritten)
- Starting an already running server will automatically restart it
- The script attempts graceful shutdown before force-killing processes
