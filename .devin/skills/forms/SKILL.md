---
name: service-hub-forms-page
description: Guide for building the drag-and-drop Form Builder and submission management dashboard.
---

# Form Builder (`client/src/pages/forms`)

## Overview
The Forms sub-app is a comprehensive drag-and-drop form builder that allows users to create custom forms, share them via unique endpoints, and analyze incoming submissions. It features a conversational one-question-at-a-time interface, smart conditional logic, and beautiful UX design.

## Key Features

### Form Builder Interface
- **Canvas-Based Editor:** Central drag-and-drop canvas for form construction
- **Field Type Picker:** Modal-based field selection (no left sidebar palette)
- **Properties Panel:** Right-side panel for field configuration
- **Auto-Save:** Automatic saving with revision history
- **Real-time Preview:** Live preview mode for testing

### Field Types
**Text & Input Fields:**
- Short Text (single-line, 0-999 characters)
- Long Text (multi-line textarea)
- Number (numeric input with validation)
- Email (email address with validation)
- Phone Number (phone input with formatting)
- Website (URL input)
- Password (masked input)

**Choice-Based Fields:**
- Multiple Choice (single selection)
- Dropdown (long lists with alphabetical sort)
- Checkbox (multiple selections)
- Yes/No (binary choice)

**Structured Data Fields:**
- Date (date picker)
- Time (time selection)
- Address (structured address input)
- File Upload (accept various file types)

**Structural Elements:**
- Header (form title with subheader)
- Rows (group fields into layout sections, each with independent column settings)
- Page Break (split form into multiple pages)
- Content Block (rich text with WYSIWYG editor)
- Hidden Fields (store metadata not visible to users)

### Field Configuration
- Basic settings (label, placeholder, help text, required, default value)
- Validation rules (email format, number format, custom regex, min/max values)
- Display options (row column layout, field positioning, hide label, read-only)

### Conditional Logic
- Show/Hide fields based on answers
- Enable/Disable fields based on conditions
- Require fields dynamically
- Skip to different pages/sections
- Visual IF/THEN rule builder with AND/OR logic
- All field types as triggers (not just choice fields)

### Form Design & Theming
- Pre-built theme gallery
- Custom theme creation
- Color customization (primary, background, text, button)
- Font selection (4-6 options)
- Background images with brightness controls
- Progress bar and question number toggles
- Custom thank you message and redirect URL

### Form Publishing & Sharing
- Unique form URL
- Form status (enable/disable)
- Password protection
- Domain restriction (optional)
- Embed options (inline, popup/modal, full-screen)
- Access controls (public, private, limited responses, time-limited)

### Submission Management
- Real-time submission storage
- Table view of all submissions
- Individual submission detail view
- Filter by date, field values
- Search and sort functionality
- CSV/Excel/JSON export options

### Analytics
- Total views and submissions
- Conversion rate (submissions/views)
- Completion rate and average time to complete
- Drop-off analysis
- Response trends over time
- Device breakdown (mobile vs desktop)

## Technical Architecture

### Database Schema
```prisma
model Form {
  id          String           @id @default(uuid())
  title       String           @db.NVarChar(255)
  schema      String           @db.NVarChar(Max) // JSON serialized
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  deletedAt   DateTime?        // Soft delete support
  submissions FormSubmission[]
  versions    FormVersion[]
}

model FormSubmission {
  id        String   @id @default(uuid())
  formId    String
  data      String   @db.NVarChar(Max) // JSON serialized
  createdAt DateTime @default(now())
  form      Form @relation(fields: [formId], references: [id])
}

model FormVersion {
  id        String   @id @default(uuid())
  formId    String
  title     String   @db.NVarChar(255)
  schema    String   @db.NVarChar(Max) // JSON snapshot
  savedById String
  savedByName String @db.NVarChar(255)
  versionNumber Int
  createdAt DateTime @default(now())
  form      Form     @relation(fields: [formId], references: [id])
}
```

### Component Structure
- **FormBuilder.jsx:** Main drag-and-drop editor
- **FormRenderer.jsx:** Public form renderer for submissions
- **PropertiesPanel.jsx:** Field configuration panel
- **FormsDashboard.jsx:** List of all forms
- **Submissions.jsx:** Submission management view

### State Management
- React useState for builder history/undo
- No global store for the form builder
- Form schema stored as JSON string in database

## Key Patterns

### Adding a New Field Type
1. Add field type to the field type picker modal
2. Add default content schema in the builder
3. Add the editor form in the properties panel
4. Add the public renderer in FormRenderer.jsx
5. Update validation rules if needed

### Form Schema Structure
```js
{
  title: "Form Title",
  description: "Form description",
  fields: [
    {
      id: "field-1",
      type: "text",
      label: "Field Label",
      placeholder: "Placeholder text",
      required: true,
      validation: { minLength: 2, maxLength: 100 }
    }
  ],
  theme: {
    primaryColor: "#2563EB",
    backgroundColor: "#F9FAFB",
    font: "Inter"
  }
}
```

## Integration Points
- **Auth System:** Uses existing JWT authentication
- **Design System:** THEME.md tokens and components
- **Database:** Prisma integration with existing schema
- **API Structure:** Consistent with existing backend patterns

## Security & Compliance
- CSRF protection on form submissions
- Input validation and sanitization
- Rate limiting for form submissions
- Data encryption at rest and in transit
- GDPR compliance features (data export, deletion)
