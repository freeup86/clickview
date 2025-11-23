# ClickView Dashboard User Guide

A comprehensive guide for users to get the most out of ClickView's dashboard features.

## Quick Start

### Creating Your First Dashboard

1. Click "New Dashboard" button
2. Give it a descriptive name
3. Click "Add Widget" to start visualizing data
4. Choose your widget type and configure it
5. Arrange widgets by dragging them around
6. Save your layout

### Adding Widgets

Widgets are the building blocks of your dashboard. Here are the available types:

#### Data Visualization Widgets
- **KPI Card**: Display a single key metric
- **Bar Chart**: Compare values across categories
- **Line Chart**: Show trends over time
- **Pie Chart**: Display proportions
- **Donut Chart**: Similar to pie chart with center space
- **Area Chart**: Cumulative trends
- **Heat Map**: Activity patterns
- **Data Table**: Detailed tabular data

#### Planning Widgets
- **Gantt Chart**: Task timelines
- **Burndown Chart**: Sprint progress tracking
- **Progress Bar**: Goal completion status

#### Other Widgets
- **Custom Field Summary**: Aggregate custom field data
- **Text Block**: Add documentation and notes

---

## Exporting Dashboards

### Quick Export

1. Click the "Export" button in dashboard header
2. Select your format:
   - **PDF**: Best for sharing and printing
   - **Excel**: For data analysis
   - **CSV**: Raw data export
   - **PowerPoint**: Presentation-ready

### Advanced Export Options

Click "Custom Export" for more control:

**Widget Selection**
- Choose specific widgets to include
- Reorder widgets for the export

**Format Options**
- Orientation: Landscape or Portrait
- Paper size: Letter, Legal, A4, A3
- Include/exclude charts
- Include/exclude raw data

**Export Management**
- View export progress in real-time
- Access export history
- Re-download previous exports

---

## Using Templates

### Finding Templates

1. Navigate to Templates page
2. Browse by category:
   - Productivity
   - Project Management
   - Sales & CRM
   - Marketing
   - Engineering
   - Executive
   - Custom

3. Use search and filters to find specific templates

### Using a Template

1. Click on a template card to preview
2. Review the widgets and layout
3. Click "Use Template"
4. Select your workspace
5. Optionally customize the name
6. Your new dashboard is created!

### Creating Your Own Templates

1. Build your perfect dashboard
2. Click "Save as Template"
3. Fill in template details:
   - Name and description
   - Category and tags
   - Public or private
4. Optionally generate a thumbnail
5. Save and share!

---

## Formula Builder

Create calculated fields with custom formulas.

### Basic Math

```
{field1} + {field2}
{total_revenue} / {tasks_completed}
({completed_tasks} / {total_tasks}) * 100
```

### Using Functions

**SUM**: Add all values
```
SUM({time_spent})
```

**AVG**: Calculate average
```
AVG({completion_time})
```

**COUNT**: Count items
```
COUNT({tasks})
```

**IF**: Conditional logic
```
IF({status} = "Complete", 1, 0)
```

### Pre-built Templates

Don't want to write formulas? Use our templates:

- **Completion Rate**: Percentage of tasks completed
- **Productivity Score**: Tasks completed vs assigned
- **Average Time**: Mean completion time
- **Velocity**: Tasks per time period
- **On-Time Rate**: Percentage delivered on time
- **Revenue per Task**: Financial efficiency

### Tips for Formulas

✅ **Do:**
- Test with sample data
- Use descriptive field names
- Document complex formulas
- Keep formulas simple when possible

❌ **Don't:**
- Create circular references
- Use undefined fields
- Over-nest functions
- Forget to validate

---

## Organizing with Folders

### Creating Folders

1. Click "New Folder" in sidebar
2. Choose a name
3. Select icon and color
4. Optionally set a parent folder
5. Save

### Moving Dashboards

**Drag and Drop:**
- Drag dashboard to folder in sidebar

**Or use context menu:**
- Right-click dashboard
- Select "Move to..."
- Choose destination folder

### Quick Views

**All Dashboards** 📊
- See every dashboard in workspace

**Favorites** ⭐
- Quickly access important dashboards
- Click star icon to favorite/unfavorite

**Recent** 🕐
- Dashboards you've viewed recently
- Sorted by last access time

---

## Sharing Dashboards

### Creating Share Links

1. Click "Share" button
2. Configure link settings:
   - **Permission level**: View Only, Can Edit, or Admin
   - **Expiration**: 1 hour to Never
   - **Password**: Optional password protection
3. Click "Create Link"
4. Copy and share the URL

### Managing Share Links

**View all links:**
- See when each link was created
- Check access statistics
- View expiration dates

**Revoke access:**
- Click "Revoke" next to any link
- Link becomes invalid immediately

### Permission Levels Explained

**View Only** 👁️
- View dashboard
- View all data
- Export data
- Cannot modify anything

**Can Edit** ✏️
- All View Only permissions
- Edit widgets
- Add/remove widgets
- Modify filters
- Cannot change settings or share

**Admin** 👑
- All Can Edit permissions
- Manage permissions
- Delete dashboard
- Share with others
- Modify all settings

---

## User & Team Permissions

### Adding Users

1. Click "Permissions" button
2. Search for user or team
3. Select from results
4. Choose their role:
   - Viewer
   - Editor
   - Admin
5. Click "Add"

### Managing Permissions

**Change role:**
- Click on current role
- Select new role from dropdown

**Remove access:**
- Click X next to user/team

**View permissions:**
- See what each role can do
- Understand permission hierarchy

---

## Comments & Collaboration

### Adding Comments

1. Click "Comments" button
2. Type your comment
3. Use markdown for formatting:
   ```markdown
   **Bold text**
   *Italic text*
   `code`
   [Link](https://example.com)
   ```
4. Click "Add Comment"

### Replying to Comments

1. Click "Reply" under any comment
2. Write your response
3. Click "Reply" button

### Managing Comments

**Edit your comments:**
- Click pencil icon
- Make changes
- Click "Save"

**Delete your comments:**
- Click trash icon
- Confirm deletion

### Comment Best Practices

✅ **Effective Comments:**
- Be specific and actionable
- Include context
- Use @mentions to notify team members
- Format with markdown for clarity

❌ **Avoid:**
- Vague feedback
- Long walls of text without formatting
- Sensitive information in comments
- Arguments or unconstructive criticism

---

## Text Block Widgets

Add documentation and notes directly to your dashboards.

### Creating Text Blocks

1. Click "Add Widget"
2. Select "Text Block"
3. Enter your content
4. Use markdown for formatting
5. Toggle between Edit and Preview
6. Save

### Markdown Syntax

**Headers:**
```markdown
# Large Header
## Medium Header
### Small Header
```

**Text Formatting:**
```markdown
**Bold text**
*Italic text*
***Bold and italic***
`inline code`
```

**Lists:**
```markdown
- Bullet point
- Another point

1. Numbered item
2. Another item
```

**Links:**
```markdown
[Link text](https://example.com)
```

### Use Cases

- Dashboard documentation
- Key insights and notes
- Instructions for team members
- Meeting notes
- Important reminders
- Change logs

---

## Tips & Tricks

### Dashboard Design

**Layout Best Practices:**
- Place most important metrics at top
- Use consistent widget sizes
- Group related information
- Leave white space for breathing room
- Use text blocks for context

**Performance:**
- Limit to 10-15 widgets per dashboard
- Use appropriate refresh intervals
- Cache expensive calculations
- Archive old dashboards

### Keyboard Shortcuts

**Dashboard View:**
- `E` - Toggle edit mode
- `F` - Toggle filters
- `S` - Open settings
- `Esc` - Close modals

**Widget Edit:**
- `Enter` - Save changes
- `Esc` - Cancel editing
- `Delete` - Remove widget (in edit mode)

### Search & Filter

**Finding Dashboards:**
- Use search bar for quick access
- Filter by folder
- Sort by name or date
- Use favorites for frequent dashboards

**Filtering Data:**
- Apply global filters to entire dashboard
- Widget-specific filters override global
- Save common filter sets
- Clear all filters quickly

---

## Troubleshooting

### Common Issues

**Dashboard not loading?**
1. Check your internet connection
2. Refresh the page (Ctrl+R / Cmd+R)
3. Clear browser cache
4. Try a different browser

**Widgets showing errors?**
1. Check data source configuration
2. Verify field references in formulas
3. Check workspace API key is valid
4. Review filter settings

**Export not working?**
1. Check if widgets have data
2. Try a different format
3. Reduce number of widgets
4. Contact support if persists

**Can't access shared dashboard?**
1. Check if link has expired
2. Verify password if required
3. Ensure you're logged in
4. Request new share link from owner

### Getting Help

**Resources:**
- Search this user guide
- Check tooltips in the interface
- Visit documentation site
- Ask in #clickview-support channel

**Contact Support:**
- Email: support@clickview.example
- Live chat: Monday-Friday 9am-5pm
- Phone: 1-800-CLICKVIEW

---

## Best Practices Summary

### Dashboard Creation
✅ Start with templates
✅ Name dashboards descriptively
✅ Organize in folders
✅ Document with text blocks
✅ Share with relevant team members

### Data Visualization
✅ Choose appropriate widget types
✅ Use clear labels and titles
✅ Keep visualizations simple
✅ Update regularly
✅ Test with various data

### Collaboration
✅ Comment constructively
✅ Use appropriate permissions
✅ Set link expiration dates
✅ Document important decisions
✅ Review access regularly

### Organization
✅ Use folder hierarchy
✅ Favorite important dashboards
✅ Archive old dashboards
✅ Tag and categorize
✅ Maintain naming conventions

---

## Frequently Asked Questions

**Q: How many dashboards can I create?**
A: No limit! Create as many as you need.

**Q: Can I undo changes?**
A: Yes, use Ctrl+Z / Cmd+Z in edit mode.

**Q: Do dashboards update in real-time?**
A: Dashboards refresh based on configured intervals.

**Q: Can I embed dashboards on other sites?**
A: Yes, use the share link in an iframe.

**Q: How do I backup my dashboards?**
A: Export as PDF or save as template regularly.

**Q: Can multiple people edit simultaneously?**
A: Currently, last save wins. Real-time collaboration coming soon!

**Q: What data sources are supported?**
A: Currently ClickUp. More integrations coming.

**Q: Is there a mobile app?**
A: Mobile-optimized web interface available now. Native app coming.

---

## Glossary

**Widget**: Individual visualization or data display component on a dashboard

**Template**: Pre-configured dashboard layout that can be reused

**Formula**: Custom calculation using fields and functions

**Share Link**: URL that provides access to a dashboard

**Permission**: Level of access granted to a user or team

**Folder**: Organizational container for dashboards

**Calculated Field**: Virtual field created with a formula

**Export**: Process of saving dashboard in external format

**Filter**: Criteria to limit data displayed on dashboard

---

*Need more help? Visit our documentation site or contact support!*

*Last updated: 2025 | Version: 1.0.0*
