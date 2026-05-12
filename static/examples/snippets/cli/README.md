# CLI Examples

This directory contains CLI examples for NATS documentation. These examples are **stored in git** (unlike Go/Rust examples which are fetched from GitHub during build).

## Directory Structure

Examples follow the pattern: `[page]/[snippet].sh`

Examples:
- `queue-groups/basic.sh` → Used by page `queue-groups` for snippet `basic`
- `request-reply/timeout.sh` → Used by page `request-reply` for snippet `timeout`

## Adding New CLI Examples

1. **Create the example file:**
   ```bash
   # Create in the appropriate directory
   static/examples/snippets/cli/[page]/[snippet].sh
   ```

2. **Write the CLI commands:**
   ```bash
   #!/bin/bash

   # Your NATS CLI commands here
   nats pub subject "message"
   ```

3. **Add to git (IMPORTANT!):**
   ```bash
   # CLI examples MUST be added to git
   git add static/examples/snippets/cli/[page]/[snippet].sh
   ```

4. **Use in documentation:**
   ```mdx
   <div class="nats-example" data-type="[page]-[snippet]" data-languages="cli,js,go,python,java,rust,csharp"></div>
   ```

## Why CLI Examples are Different

- **All other languages** (Go, Rust, JavaScript, Python, Java, C#, etc.): Stored in their respective client repos and fetched during build
- **CLI examples**: Stored directly in this repo and committed to git
- **Reason**: CLI examples are simple shell scripts that don't need separate repos
- **gitignore**: Uses pattern `static/examples/snippets/*` to ignore all languages, with exception `!static/examples/snippets/cli/` to keep CLI tracked

## Example Workflow

```bash
# 1. Create new CLI example
echo '#!/bin/bash
nats pub hello "world"' > static/examples/snippets/cli/basics/hello.sh

# 2. Add to git (don't forget this!)
git add static/examples/snippets/cli/basics/hello.sh

# 3. Commit
git commit -m "Add CLI example for basics-hello"

# 4. Use in docs
# In your .md file:
# <div class="nats-example" data-type="basics-hello" data-languages="cli"></div>
```

## Troubleshooting

**Q: My CLI example isn't showing up in production**
A: Did you `git add` the file? CLI examples must be committed to git.

**Q: How do I check if a CLI example is tracked?**
A: Run `git ls-files static/examples/snippets/cli/` to see all tracked files.

**Q: I added the file but it's not in git**
A: The parent `snippets/` directory is in `.gitignore` for Go/Rust examples.
   You need to explicitly add CLI files with `git add static/examples/snippets/cli/your-file.sh`
