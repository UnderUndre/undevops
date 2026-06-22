$HOST_ADDR = $env:PROD_SSH_HOST
Write-Host "DEBUG: args count = $($args.Count)"
foreach ($a in $args) { Write-Host "DEBUG: arg = $a" }
if (-not $HOST_ADDR) { $HOST_ADDR = "ai-twins-non-root-prod" }
$DB_CONTAINER = $env:PROD_DB_CONTAINER
if (-not $DB_CONTAINER) { $DB_CONTAINER = "ai-twins-db-prod" }
$APP_CONTAINER = $env:PROD_APP_CONTAINER
if (-not $APP_CONTAINER) { $APP_CONTAINER = "ai-twins-app-prod" }
$REDIS_CONTAINER = $env:PROD_REDIS_CONTAINER
if (-not $REDIS_CONTAINER) { $REDIS_CONTAINER = "ai-twins-redis" }
$DB_NAME = $env:POSTGRES_DB
if (-not $DB_NAME) { $DB_NAME = "ai_digital_twins" }
$DB_ADMIN = $env:POSTGRES_USER
if (-not $DB_ADMIN) { $DB_ADMIN = "admin" }
$AI_USER = $env:AI_READONLY_USER
if (-not $AI_USER) { $AI_USER = "ai_readonly" }
$APP_WORKDIR = $env:PROD_APP_WORKDIR
if (-not $APP_WORKDIR) { $APP_WORKDIR = "/app" }

function Confirm-OrDie {
    param([string]$pretty)
    Write-Host ("!!! About to execute on PROD (" + $HOST_ADDR + " -> " + $APP_CONTAINER + "):") -ForegroundColor Yellow
    Write-Host ("   $ " + $pretty)
    if ($env:PROD_EXEC_YES -eq "1") {
        Write-Host "(PROD_EXEC_YES=1 - auto-confirmed)"
        return $true
    }
    $reply = Read-Host "Continue? (y/N)"
    if ($reply -notmatch "^[Yy]$") {
        Write-Host "Aborted."
        exit 0
    }
    return $true
}

function Escape-ShellArg {
    param([string]$arg)
    if ($null -eq $arg) { return "''" }
    return "'" + $arg.Replace("'", "'\\''") + "'"
}

if ($args.Count -eq 0) {
    Write-Host "Usage: .\scripts\prod-exec.ps1 <command> [args]"
    Write-Host "Commands: sql, ai-sql, logs, redis, sh, pull, tsx, npm, seed-validators, backup, langfuse, setup-ai-user, reindex"
    exit 1
}

$command = $args[0]
$remainingArgs = if ($args.Count -gt 1) { $args[1..($args.Count - 1)] } else { @() }

switch ($command) {
    "sql" {
        if (-not $remainingArgs[0]) { Write-Host "Usage: sql <query>"; exit 1 }
        $sqlArg = $remainingArgs[0]
        if (-not (Confirm-OrDie "psql (admin) -c $sqlArg")) { return }
        if (Test-Path $sqlArg -PathType Leaf) {
            Get-Content $sqlArg -Raw | ssh $HOST_ADDR "docker exec -i $DB_CONTAINER psql -U $DB_ADMIN -d $DB_NAME"
        } else {
            $escapedSql = Escape-ShellArg $sqlArg
            ssh $HOST_ADDR "docker exec $DB_CONTAINER psql -U $DB_ADMIN -d $DB_NAME -c $escapedSql"
        }
    }

    "ai-sql" {
        if (-not $remainingArgs[0]) { Write-Host "Usage: ai-sql <query>"; exit 1 }
        $sqlArg = $remainingArgs[0]
        if (-not (Confirm-OrDie "psql (ai_readonly) -c $sqlArg")) { return }
        $escapedSql = Escape-ShellArg $sqlArg
        ssh $HOST_ADDR "docker exec $DB_CONTAINER psql -U $AI_USER -d $DB_NAME -c $escapedSql"
    }

    "logs" {
        $lines = if ($remainingArgs[0]) { $remainingArgs[0] } else { "100" }
        ssh $HOST_ADDR "docker logs --tail $lines $APP_CONTAINER"
    }

    "redis" {
        if (-not $remainingArgs[0]) { Write-Host "Usage: redis <cmd>"; exit 1 }
        $escapedRedis = Escape-ShellArg $remainingArgs[0]
        ssh $HOST_ADDR "docker exec $REDIS_CONTAINER redis-cli $escapedRedis"
    }

    "sh" {
        if (-not $remainingArgs[0]) { Write-Host "Usage: sh <cmd>"; exit 1 }
        $shCmd = $remainingArgs[0]
        if (-not (Confirm-OrDie $shCmd)) { return }
        ssh $HOST_ADDR $shCmd
    }

    "reindex" {
        $model = if ($remainingArgs[0]) { $remainingArgs[0] } else { "gemini-embedding-001" }
        if (-not (Confirm-OrDie "reindex $model")) { return }
        ssh -t $HOST_ADDR "docker exec -i -w $APP_WORKDIR $APP_CONTAINER npx tsx server/scripts/reindex-knowledge.ts --model $model"
    }

    "pull" {
        ssh $HOST_ADDR "cd ~/ai-digital-twins; git fetch origin main; git pull --ff-only origin main"
    }

    "tsx" {
        if (-not $remainingArgs[0]) { exit 1 }
        $scriptPath = Escape-ShellArg $remainingArgs[0]
        $scriptArgs = ""
        if ($remainingArgs.Count -gt 1) {
            foreach ($a in $remainingArgs[1..($remainingArgs.Count-1)]) { $scriptArgs += " " + (Escape-ShellArg $a) }
        }
        if (-not (Confirm-OrDie ("tsx " + $scriptPath + $scriptArgs))) { return }
        ssh -t $HOST_ADDR "docker exec -i -w $APP_WORKDIR $APP_CONTAINER npx tsx $scriptPath$scriptArgs"
    }

    "npm" {
        if (-not $remainingArgs[0]) { exit 1 }
        $npmArgs = ""
        foreach ($a in $remainingArgs) { $npmArgs += " " + (Escape-ShellArg $a) }
        if (-not (Confirm-OrDie ("npm" + $npmArgs))) { return }
        ssh -t $HOST_ADDR "docker exec -i -w $APP_WORKDIR $APP_CONTAINER npm $npmArgs"
    }

    "seed-validators" {
        & $PSCommandPath @("tsx", "scripts/seed-system-defaults.ts")
    }

    "backup" {
        $ts = Get-Date -Format "yyyyMMdd_HHmmss"
        ssh $HOST_ADDR "mkdir -p ~/ai-digital-twins/backups; docker exec $DB_CONTAINER pg_dump -U $DB_ADMIN -Fc $DB_NAME > ~/ai-digital-twins/backups/pre_ai_$ts.dump"
    }

    "langfuse" {
        $lfArgs = ""
        foreach ($a in $remainingArgs) { $lfArgs += " " + (Escape-ShellArg $a) }
        ssh -t $HOST_ADDR "cd ~/ai-digital-twins; ./scripts/deploy-langfuse.sh$lfArgs"
    }

    "setup-ai-user" {
        $aiPass = Read-Host "Password for ai_readonly (empty for random)"
        if ([string]::IsNullOrWhiteSpace($aiPass)) {
            $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
            $bytes = New-Object byte[] 32
            $rng.GetBytes($bytes)
            $aiPass = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
        }
        $sql = "DO `$$do`$$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$AI_USER') THEN CREATE ROLE `"$AI_USER`" WITH LOGIN PASSWORD '$aiPass'; ELSE ALTER ROLE `"$AI_USER`" WITH PASSWORD '$aiPass'; END IF; END `$$do`$$; GRANT CONNECT ON DATABASE `"$DB_NAME`" TO `"$AI_USER`"; GRANT USAGE ON SCHEMA public TO `"$AI_USER`"; GRANT SELECT ON ALL TABLES IN SCHEMA public TO `"$AI_USER`"; GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO `"$AI_USER`"; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO `"$AI_USER`"; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO `"$AI_USER`"; REVOKE CREATE ON SCHEMA public FROM `"$AI_USER`";"
        if (-not (Confirm-OrDie "setup-ai-user $AI_USER")) { return }
        $sql | ssh $HOST_ADDR "docker exec -i $DB_CONTAINER psql -U $DB_ADMIN -d $DB_NAME"
        Write-Host "User created. Password: $aiPass"
    }

    "logs" {
        $tail = if ($remainingArgs[0]) { $remainingArgs[0] } else { "100" }
        ssh $HOST_ADDR "docker logs --tail $tail $APP_CONTAINER"
    }

    Default {
        Write-Host "Unknown command: $command"
        exit 1
    }
}
