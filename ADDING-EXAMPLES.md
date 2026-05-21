# Adding Code Examples to NATS Documentation

Quick reference for adding code examples using the nats-example system.

## TL;DR

```bash
# 1. Create CLI example (in this repo)
echo '#!/bin/bash
nats pub subject "message"' > static/examples/snippets/cli/[page]/[snippet].sh

# 2. IMPORTANT: Add to git!
git add static/examples/snippets/cli/[page]/[snippet].sh

# 3. Create Go example (in nats.go-docs repo)
cd ~/coding/nats.go-docs
# Create examples/docs/[page]-[snippet]/main.go with NATS-DOC-START/END markers
git add examples/docs/[page]-[snippet]/
git commit -m "Add [page]-[snippet] example"
git push origin doc-examples

# 4. Create Rust example (in nats.rs-docs repo)
cd ~/coding/nats.rs-docs
# Create async-nats/examples/docs_[page]_[snippet].rs with NATS-DOC-START/END markers
git add async-nats/examples/docs_[page]_[snippet].rs
git commit -m "Add [page]-[snippet] example"
git push origin doc-examples

# 5. Update fetch config and test locally
cd ~/coding/new-nats.docs
# Add entries to scripts/fetch-examples.js
npm run fetch-examples

# 6. Use in documentation
# <div class="nats-example" data-type="[page]-[snippet]" data-languages="cli,js,go,python,java,rust,csharp"></div>
```

## Directory Structure

```
# CLI examples (stored in git in this repo)
static/examples/snippets/cli/
  ├── queue-groups/
  │   ├── basic.sh
  │   └── dynamic-scaling.sh
  ├── request-reply/
  │   ├── basic.sh
  │   └── timeout.sh
  └── subjects/
      └── monitoring.sh

# Go examples (fetched from nats.go during build)
~/coding/nats.go-docs/examples/docs/
  ├── queue-groups-basic/main.go
  ├── queue-groups-dynamic-scaling/main.go
  ├── request-reply-basic/main.go
  └── request-reply-timeout/main.go

# Rust examples (fetched from nats.rs during build)
~/coding/nats.rs-docs/async-nats/examples/
  ├── docs_queue_groups_basic.rs
  ├── docs_queue_groups_dynamic_scaling.rs
  ├── docs_request_reply_basic.rs
  └── docs_request_reply_timeout.rs
```

## Naming Convention

Examples use pattern: `[page]-[snippet]`

- **Documentation page**: `queue-groups`
- **Example snippet**: `basic`
- **Example type**: `queue-groups-basic`

### Language-Specific Paths

| Language | Path Pattern | Example |
|----------|-------------|---------|
| CLI | `cli/[page]/[snippet].sh` | `cli/queue-groups/basic.sh` |
| Go | `[page]-[snippet]/main.go` | `queue-groups-basic/main.go` |
| Rust | `docs_[page]_[snippet].rs` | `docs_queue_groups_basic.rs` |

## Step-by-Step Walkthrough

### 1. Create CLI Example

```bash
# CLI examples live in this repo
mkdir -p static/examples/snippets/cli/queue-groups
cat > static/examples/snippets/cli/queue-groups/basic.sh << 'EOF'
#!/bin/bash

# Terminal 1: Worker subscribes to queue
nats sub tasks --queue workers

# Terminal 2: Publish work
nats pub tasks "Process this"
EOF

# CRITICAL: Add to git (CLI examples MUST be in git)
git add static/examples/snippets/cli/queue-groups/basic.sh
```

### 2. Create Go Example

```bash
cd ~/coding/nats.go-docs
git checkout doc-examples

mkdir -p examples/docs/queue-groups-basic
cat > examples/docs/queue-groups-basic/main.go << 'EOF'
package main

import (
    "fmt"
    "github.com/nats-io/nats.go"
)

func main() {
    nc, _ := nats.Connect(nats.DefaultURL)
    defer nc.Close()

    // NATS-DOC-START
    nc.QueueSubscribe("tasks", "workers", func(m *nats.Msg) {
        fmt.Printf("Processing: %s\n", string(m.Data))
    })

    nc.Publish("tasks", []byte("Process this"))
    // NATS-DOC-END
}
EOF

git add examples/docs/queue-groups-basic/
git commit -m "Add queue-groups-basic example"
git push origin doc-examples
```

### 3. Create Rust Example

```bash
cd ~/coding/nats.rs-docs
git checkout doc-examples

cat > async-nats/examples/docs_queue_groups_basic.rs << 'EOF'
use async_nats;
use futures::StreamExt;

#[tokio::main]
async fn main() -> Result<(), async_nats::Error> {
    let client = async_nats::connect("localhost:4222").await?;

    // NATS-DOC-START
    let mut sub = client.queue_subscribe("tasks", "workers").await?;
    tokio::spawn(async move {
        while let Some(msg) = sub.next().await {
            println!("Processing: {}", String::from_utf8_lossy(&msg.payload));
        }
    });

    client.publish("tasks", "Process this".into()).await?;
    // NATS-DOC-END

    Ok(())
}
EOF

git add async-nats/examples/docs_queue_groups_basic.rs
git commit -m "Add queue-groups-basic example"
git push origin doc-examples
```

### 4. Update Fetch Configuration

```bash
cd ~/coding/new-nats.docs

# Edit scripts/fetch-examples.js
# Add to "go" section:
"queue-groups-basic": "examples/docs/queue-groups-basic/main.go",

# Add to "rust" section:
"queue-groups-basic": "async-nats/examples/docs_queue_groups_basic.rs",
```

### 5. Test Locally

```bash
# Fetch examples from GitHub
npm run fetch-examples

# Should see:
# ✓ queue-groups-basic -> queue-groups/basic.go
# ✓ queue-groups-basic -> queue-groups/basic.rs
# ✓ queue-groups-basic -> queue-groups/basic.sh
```

### 6. Use in Documentation

```mdx
## Queue Groups

Basic queue group example:

<div class="nats-example" data-type="queue-groups-basic" data-languages="cli,js,go,python,java,rust,csharp"></div>
```

## Common Issues

### CLI Example Not Showing in Production

**Problem**: Created CLI example but it's missing online
**Solution**: CLI examples must be committed to git
```bash
git add static/examples/snippets/cli/[page]/[snippet].sh
git commit -m "Add CLI example"
```

### Go/Rust Example Not Showing

**Problem**: Example exists but not fetched
**Solution**:
1. Verify it's pushed to GitHub doc-examples branch
2. Verify it's in scripts/fetch-examples.js
3. Run `npm run fetch-examples` locally to test

### Example Shows Wrong Code

**Problem**: Old version is displayed
**Solution**: Clear build cache and re-fetch
```bash
rm -rf static/examples/snippets/go static/examples/snippets/rust
npm run fetch-examples
```

## Key Differences: CLI vs Other Languages

| Aspect | CLI Examples | Other Languages (Go/Rust/JS/etc) |
|--------|--------------|----------------------------------|
| **Location** | This repo | Client repos (nats.go, nats.rs, etc.) |
| **Storage** | Committed to git | Fetched during build |
| **Path** | `static/examples/snippets/cli/` | `static/examples/snippets/{go,rust,javascript,python,...}/` |
| **When to add** | `git add` immediately | Push to client repo, then fetch |
| **gitignore** | NOT ignored (exception) | ALL ignored (rule: `static/examples/snippets/*`) |
| **Future languages** | Never changes | Automatically ignored when added |

## Documentation

- Full workflow: `static/examples/snippets/cli/README.md`
- Style guide: `CLAUDE.md`
- Fetch script: `scripts/fetch-examples.js`
