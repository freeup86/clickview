# ClickView Enterprise - Agent Workflow

## Beads (BD) Issue Tracking System

This project uses the beads (`bd`) system for tracking implementation tasks, features, and issues.

### Bead Structure

Each bead represents a discrete unit of work with:
- **ID**: Unique identifier (e.g., `SEC-001`, `FEAT-042`)
- **Title**: Brief description
- **Status**: `open`, `in-progress`, `review`, `done`, `blocked`
- **Priority**: `critical`, `high`, `medium`, `low`
- **Category**: `security`, `feature`, `bug`, `refactor`, `docs`
- **Assignee**: Team member or agent responsible
- **Dependencies**: Other beads that must complete first
- **Estimate**: Time estimate in hours
- **Actual**: Actual time spent

### Bead Categories

**SEC** - Security & Compliance
**AUTH** - Authentication & Authorization
**ARCH** - Architecture & Infrastructure
**API** - Backend API Development
**UI** - Frontend User Interface
**VIZ** - Data Visualization
**DRILL** - Drill-Down Features
**REPORT** - Enterprise Reporting
**AI** - AI/ML Features
**PERF** - Performance Optimization
**TEST** - Testing & Quality
**DOC** - Documentation
**OPS** - DevOps & Deployment

### Commands

```bash
# List all beads
bd list

# Create new bead
bd create <category> "<title>" --priority <level> --estimate <hours>

# Update bead status
bd update <bead-id> --status <status>

# Show bead details
bd show <bead-id>

# Link dependencies
bd link <bead-id> --depends-on <other-bead-id>

# Search beads
bd search <query>

# Generate report
bd report --status open --priority critical
```

### Workflow

1. **Planning Phase**
   - Create beads for all features from requirements
   - Establish dependencies
   - Assign priorities

2. **Implementation Phase**
   - Move bead to `in-progress`
   - Implement feature completely (no placeholders)
   - Update bead with progress notes

3. **Review Phase**
   - Move to `review` status
   - Code review and testing
   - Address feedback

4. **Completion Phase**
   - Move to `done` status
   - Document in changelog
   - Update dependencies

### Rules

- **NO TODO comments** - Use beads instead
- **NO placeholders** - Complete implementation only
- **NO mock data** - Real database connections
- **Full-stack completeness** - Every backend feature needs UI
- **Zero-based metrics** - Only return 0 for legitimate empty states

### Enterprise Upgrade Principles

1. **Security First**: Fix all security issues before adding features
2. **Scalability**: Design for 10,000+ concurrent users
3. **Performance**: Sub-second query responses
4. **Completeness**: Every feature fully implemented
5. **Enterprise Grade**: Production-ready code only
