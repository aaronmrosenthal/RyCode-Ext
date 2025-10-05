# GitHub Event Triggers

## Configuration

### Commands

- **Pull latest changes**

    - Run: `git pull`
    - Timeout: 60s
    - Phase: task_run

- **Install dependencies**
    - Run: `pnpm install`
    - Timeout: 60s
    - Phase: task_run

### GitHub Events

- **issues.opened** → `github.issue.fix`
- **issue_comment.created** → `github.issue.comment.respond`
- **pull_request.opened** → `github.pr.review`
- **pull_request_review_comment.created** → `github.pr.comment.respond`
