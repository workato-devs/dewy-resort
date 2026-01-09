# MCP Compositional Architecture Workshop

This branch contains the GitHub Pages source for the workshop documentation site.

## Local Development

1. Install Ruby 3.0+ (via Homebrew: `brew install ruby@3.3`)
2. Install dependencies:
   ```bash
   export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"
   bundle install
   ```
3. For local development, edit `_config.yml`:
   - Comment out `remote_theme: just-the-docs/just-the-docs`
   - Uncomment `theme: just-the-docs`
4. Start the server:
   ```bash
   bundle exec jekyll serve
   ```
5. Open http://localhost:4000

## Facilitator/Attendee Toggle

The site includes a persona toggle (top-right button) that shows/hides facilitator-only content:

- **Attendee mode** (default): Standard workshop content
- **Facilitator mode**: Additional timing notes, talking points, and answers

The toggle preference is saved in localStorage and persists across page loads.

## Content Structure

```
docs/
  units/           # Workshop units (in order)
  guides/          # Reference guides
architecture/      # Architecture diagrams and explanations
```

## Deployment

This branch is configured for GitHub Pages deployment. Push to trigger automatic build.

In Repository Settings > Pages:
- Source: Deploy from branch
- Branch: `workshop-pages` / `/ (root)`
