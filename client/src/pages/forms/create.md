# Forms Sub App - Requirements & Features

## Overview
The Forms sub app is a drag-and-drop form builder that allows users to create custom forms, share them via unique endpoints, and analyze incoming submissions. This document outlines the requirements and features based on research of leading form builders: Typeform, JotForm, Google Forms, and Formstack.

## Core Value Proposition
- **Conversational Design**: One-question-at-a-time interface for higher completion rates
- **Visual Builder**: Intuitive drag-and-drop canvas for form creation
- **Smart Logic**: Conditional branching and calculations for dynamic forms
- **Seamless Integration**: Webhooks and API for connecting with existing tools
- **Beautiful UX**: Premium design aesthetic with smooth animations

## Phase 1: MVP Features

### 1. Form Builder Interface
**Canvas-Based Editor**
- Central drag-and-drop canvas for form construction
- Left sidebar with categorized field palette (Basic, Advanced, Payments)
- Right properties panel for field configuration
- Top toolbar for global actions (undo/redo, preview, publish)
- Auto-save functionality with basic revision history
- Real-time preview mode

**Field Management**
- Drag-and-drop reordering of fields
- Click-to-add alternative to drag-and-drop
- Duplicate/copy fields
- Delete fields with confirmation
- Field search functionality
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)

### 2. Core Field Types
**Text & Input Fields**
- Short Text (single-line, 0-999 characters)
- Long Text (multi-line textarea)
- Number (numeric input with validation)
- Email (email address with validation)
- Phone Number (phone input with formatting)
- Website (URL input)
- Password (masked input)

**Choice-Based Fields**
- Multiple Choice (single selection)
- Dropdown (long lists with alphabetical sort)
- Checkbox (multiple selections)
- Yes/No (binary choice)

**Structured Data Fields**
- Date (date picker)
- Time (time selection)
- Address (structured address input)
- File Upload (accept various file types)

**Structural Elements**
- Header (form title with subheader)
- Section Break (group fields into sections)
- Page Break (split form into multiple pages)
- Hidden Fields (store metadata not visible to users)

### 3. Field Configuration
**Basic Settings**
- Field label/title
- Placeholder text
- Help text/description
- Required field toggle
- Default value
- Character limits (min/max)

**Validation Rules**
- Email format validation
- Number format validation
- Custom regex patterns
- Minimum/maximum value constraints
- File type restrictions
- File size limits

**Display Options**
- Field width (full, half, quarter)
- Field positioning (move to new line, merge)
- Hide label option
- Read-only option

### 4. Conditional Logic
**Basic Logic Types**
- Show/Hide fields based on answers
- Enable/Disable fields based on conditions
- Require fields dynamically
- Skip to different pages/sections

**Logic Builder**
- Visual IF/THEN rule builder
- Multiple conditions with AND/OR logic
- Field selector with search
- Real-time preview of logic behavior
- Condition ordering for complex chains

**Logic Triggers**
- All field types as triggers (not just choice fields)
- Cross-field validation
- Comparison operators (equals, contains, greater than, etc.)

### 5. Form Design & Theming
**Theme System**
- Pre-built theme gallery
- Custom theme creation
- Color customization:
  - Primary color
  - Background color
  - Text color
  - Button color
- Font selection (4-6 options)
- Background images with brightness controls

**Form Settings**
- Show/hide progress bar
- Show/hide question numbers
- Custom thank you message
- Custom redirect URL on completion
- Button text customization
- Form title and description

**Layout Options**
- Single-page form (all questions on one page)
- Multi-page form (questions split across pages)
- Section-based organization
- Column layouts (1-4 columns)

### 6. Form Publishing & Sharing
**Publishing Options**
- Unique form URL
- Form status (enable/disable)
- Password protection
- Domain restriction (optional)

**Embed Options**
- Inline embed (iframe)
- Popup/modal embed
- Full-screen embed
- Embed configuration options (auto-resize, hide headers)

**Access Controls**
- Public forms (anyone can access)
- Private forms (authenticated users only)
- Limited responses (max submission count)
- Time-limited forms (start/end dates)

### 7. Submission Management
**Response Collection**
- Real-time submission storage
- Automatic timestamp recording
- Respondent identification (optional)
- Draft auto-save (30-day retention)

**Response Viewing**
- Table view of all submissions
- Individual submission detail view
- Filter by date, field values
- Search submissions
- Sort by any field

**Export Options**
- CSV export
- Excel export
- JSON export (for API integration)
- PDF generation (optional)

### 8. Basic Analytics
**Form Performance**
- Total views
- Total submissions
- Conversion rate (submissions/views)
- Completion rate
- Average time to complete

**Drop-off Analysis**
- Identify where users abandon forms
- Field-level bottleneck analysis
- Page-by-page completion rates

**Response Trends**
- Submissions over time (chart)
- Device breakdown (mobile vs desktop)
- Source tracking (UTM parameters)

### 9. User Experience Best Practices
**Mobile Optimization**
- Responsive design by default
- Touch-friendly interface
- Mobile preview mode
- Single-column layout on mobile
- Large tap targets

**Accessibility**
- Keyboard navigation support
- Screen reader compatibility
- ARIA attributes
- Color contrast compliance (WCAG AA)
- Focus management

**Performance**
- Fast loading forms
- Smooth drag-and-drop
- Optimized re-renders
- Lazy loading of field options
- Efficient state management

## Phase 2: Advanced Features

### 1. Advanced Field Types
**Rating & Feedback**
- Star Rating (1-5 stars)
- Numeric Rating (1-10 scale)
- Opinion Scale (Likert-style 1-7)
- NPS (Net Promoter Score 0-10)
- Ranking (order items by preference)

**Rich Media**
- Image display (logos, graphics)
- Video embed (YouTube, Vimeo)
- Audio recording
- Video recording
- Signature capture (type, draw, upload)

**Complex Data**
- Matrix (grid-based questions)
- Input Table (multi-type columns)
- Configurable List (dynamic add/remove rows)
- Calculation fields (mathematical operations)

### 2. Advanced Conditional Logic
**Calculations**
- Mathematical operations (add, subtract, multiply, divide)
- Field references in calculations
- Score-based quizzes
- Outcome-based routing
- Custom variables

**Visual Logic Map**
- Interactive flow visualization
- Drag-and-drop logic connections
- View entire form flow at glance
- Edit logic directly from map
- Troubleshooting complex flows

**Advanced Logic Types**
- Email routing based on answers
- Data routing to different endpoints
- Dynamic thank you pages
- PDF generation routing
- Webhook triggering

### 3. Collaboration Features
**Team Collaboration**
- Multiple user roles (Admin, Editor, Viewer)
- Real-time collaboration (multiple editors)
- Comments on specific fields
- Activity/audit log
- Folder-based organization

**Form Sharing**
- Share with specific users
- Organization-wide sharing
- Public/private form folders
- Template sharing across team

**Version Control**
- Revision history (time machine)
- Compare form versions
- Revert to previous versions
- Draft vs published versions
- Change notes/comments

### 4. Integration Ecosystem
**Native Integrations**
- Google Sheets (automatic sync)
- Slack (notifications)
- Email marketing (Mailchimp, etc.)
- CRM (HubSpot, Salesforce)
- Webhooks (custom integrations)

**API Capabilities**
- RESTful API for form management
- Create/update/delete forms programmatically
- Retrieve submissions via API
- Webhook for real-time notifications
- Embed SDK for custom implementations

**Automation**
- Zapier integration
- Make (Integromat) integration
- Custom workflow automation
- Trigger-based actions
- Multi-step workflows

### 5. Advanced Analytics
**Response Analysis**
- AI-powered insights (sentiment, topics, patterns)
- Comparative analysis
- Cross-tabulation
- Advanced filtering
- Custom reports

**Form Analytics**
- Drop-off heatmaps
- Time spent per question
- Device-specific analytics
- Geographic distribution
- Source attribution (UTM tracking)

**Data Visualization**
- Custom charts and graphs
- Pivot tables
- Export to business intelligence tools
- Scheduled reports
- Dashboard views

### 6. Template System
**Template Library**
- Industry-specific templates (HR, Marketing, Events)
- Use case templates (Lead Gen, Feedback, Surveys)
- Quick start templates
- Template customization
- Save custom templates

**AI-Powered Templates**
- Generate forms from descriptions
- AI template recommendations
- Import from documents (AI structures)
- Smart template suggestions

### 7. Multi-Language Support
**Translation Features**
- Multi-language forms (25+ languages)
- Auto-detect browser language
- Manual translation interface
- AI-powered translation
- Right-to-left support (Arabic, Hebrew)

**Language Management**
- All responses in one place
- Language-specific analytics
- Switch language in form
- Translation memory

### 8. Payment Integration
**Payment Fields**
- Product selection
- Order form
- Donation collection
- Subscription/recurring payments
- Custom amount

**Payment Processors**
- Stripe integration
- PayPal integration
- Square integration
- Apple Pay/Google Pay
- ACH processing

**Payment Features**
- Conditional payments
- Discount codes
- Tax calculation
- Receipt generation
- Payment tracking

## Phase 3: Premium Features

### 1. AI Capabilities
**AI Form Generation**
- Create entire forms from prompts
- AI-powered field suggestions
- Smart field type detection
- Auto-generate form structure

**AI Analysis**
- Smart insights from responses
- Sentiment analysis
- Topic extraction
- Pattern recognition
- Predictive analytics

**AI Translation**
- Auto-translate forms
- Real-time translation
- Translation quality checks
- Multi-language AI generation

### 2. Advanced Workflows
**Workflow Automation**
- Multi-step approval processes
- Dynamic participant assignment
- Conditional routing
- Document generation pipelines
- E-signature integration

**Business Process**
- Forms → Documents → Sign
- Cross-product workflows
- External participant users
- Step-based approvals
- Group approvals

### 3. Enterprise Features
**Security & Compliance**
- HIPAA compliance (BAA available)
- GDPR compliance
- SOC 2 Type II certification
- Data encryption (at rest and in transit)
- Two-factor authentication
- SSO/SAML authentication
- IP whitelisting
- Audit logging

**Advanced Permissions**
- Subaccounts
- User groups
- Folder-level access control
- Form-level permissions
- Integration credential sharing
- Advanced user roles

**Data Management**
- Data retention policies
- Data export (full account export)
- Data anonymization
- Custom data residency
- Backup and restore

### 4. Advanced Designer
**CSS Inspector**
- Pixel-perfect control
- Custom CSS injection
- Element-level styling
- Advanced layout controls
- CSS variables support

**Brand Kits**
- Reusable brand assets
- Custom fonts
- Logo management
- Color palettes
- Style consistency across forms

**Advanced Layouts**
- Grid-based layouts
- Custom breakpoints
- Responsive design controls
- Mobile-specific layouts
- Print-friendly styles

### 5. Mobile App
**Offline Collection**
- Fill forms without internet
- Sync when online
- Draft management
- Location-based data collection

**Mobile-Specific Features**
- Camera integration
- GPS location capture
- Push notifications
- Barcode/QR scanning
- Voice-to-text

### 6. Advanced Reporting
**Custom Reports**
- Drag-and-drop report builder
- Custom calculations
- Scheduled reports
- Automated delivery
- Report templates

**Data Visualization**
- Advanced charts
- Geographic maps
- Heatmaps
- Funnel analysis
- Cohort analysis

**Export Options**
- Advanced Excel exports
- PDF reports
- Power BI integration
- Tableau integration
- Custom data connectors

## Technical Architecture

### Frontend Stack
- **Framework**: React (following project conventions)
- **State Management**: Context API or Redux
- **Drag-and-Drop**: react-dnd or dnd-kit
- **Form Validation**: react-hook-form or Yup
- **UI Components**: Tailwind CSS (following project theme system)
- **Rich Text**: Tiptap or similar (if needed)

### Backend Stack
- **API**: RESTful endpoints (following project conventions)
- **Database**: Prisma ORM (following project conventions)
- **Authentication**: Existing auth system
- **File Storage**: Existing file storage system
- **Webhooks**: Custom webhook implementation

### Data Model
**Form Schema**
```typescript
{
  id: string
  title: string
  description: string
  status: 'draft' | 'published' | 'archived'
  theme: Theme
  fields: Field[]
  logic: LogicRule[]
  settings: FormSettings
  createdAt: Date
  updatedAt: Date
  createdBy: string
}
```

**Field Schema**
```typescript
{
  id: string
  type: FieldType
  label: string
  placeholder?: string
  helpText?: string
  required: boolean
  validation?: ValidationRules
  defaultValue?: any
  options?: Option[]
  settings: FieldSettings
}
```

**Submission Schema**
```typescript
{
  id: string
  formId: string
  data: Record<string, any>
  submittedAt: Date
  respondentId?: string
  metadata: SubmissionMetadata
}
```

### API Endpoints
**Form Management**
- POST /api/forms - Create form
- GET /api/forms/:id - Get form
- PUT /api/forms/:id - Update form
- DELETE /api/forms/:id - Delete form
- GET /api/forms - List forms

**Form Publishing**
- POST /api/forms/:id/publish - Publish form
- POST /api/forms/:id/unpublish - Unpublish form
- GET /api/forms/:id/preview - Preview form

**Submissions**
- POST /api/forms/:id/submissions - Submit form
- GET /api/forms/:id/submissions - Get submissions
- GET /api/forms/:id/submissions/:id - Get submission
- DELETE /api/forms/:id/submissions/:id - Delete submission
- GET /api/forms/:id/submissions/export - Export submissions

**Analytics**
- GET /api/forms/:id/analytics - Get form analytics
- GET /api/forms/:id/analytics/drop-off - Get drop-off analysis

**Webhooks**
- POST /api/forms/:id/webhooks - Create webhook
- GET /api/forms/:id/webhooks - List webhooks
- DELETE /api/forms/:id/webhooks/:id - Delete webhook

## Success Metrics

### User Engagement
- Form creation rate
- Form completion rate
- Average time to create form
- User retention (returning users)

### Form Performance
- Average completion rate (>70% target)
- Average time to complete (<3 minutes target)
- Mobile completion rate
- Drop-off rate (<20% target)

### Technical Performance
- Form load time (<2 seconds)
- Builder responsiveness (smooth drag-and-drop)
- API response time (<200ms)
- Uptime (>99.9%)

## Competitive Advantages

### vs Typeform
- More affordable pricing
- Traditional form layout option (not just conversational)
- More advanced conditional logic
- Better collaboration features

### vs JotForm
- Cleaner, more modern UI
- Better mobile experience
- More advanced AI features
- Better performance/speed

### vs Google Forms
- More field types
- Advanced conditional logic
- Better customization
- Professional templates
- API and webhooks

### vs Formstack
- More intuitive builder
- Better UX/design
- More modern tech stack
- More affordable for small teams

## Implementation Priority

### Sprint 1 (Weeks 1-2)
- Basic form builder UI
- Core field types (text, choice, date)
- Field configuration panel
- Form saving/loading

### Sprint 2 (Weeks 3-4)
- Conditional logic (show/hide)
- Form theming
- Form publishing
- Submission collection

### Sprint 3 (Weeks 5-6)
- Submission management UI
- Basic analytics
- Export functionality
- Mobile optimization

### Sprint 4 (Weeks 7-8)
- Advanced field types
- Advanced conditional logic
- Templates
- Integration webhooks

## Notes

### Design Considerations
- Follow existing project design system (THEME.md)
- Use Tailwind CSS for styling
- Maintain consistency with other sub-apps
- Ensure responsive design by default

### Performance Considerations
- Lazy load field options
- Optimize re-renders in builder
- Implement efficient state management
- Use caching strategies

### Security Considerations
- Sanitize all user inputs
- Implement rate limiting
- Validate submissions server-side
- Secure file uploads
- Implement CSRF protection

### Accessibility Considerations
- WCAG AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus management

## Implementation Progress

### ✅ Completed Features (Current State)

#### 1. Form Builder Interface
- ✅ Canvas-based drag-and-drop editor using @hello-pangea/dnd
- ✅ Left sidebar with field palette (12 field types including page break)
- ✅ Right properties panel for field configuration and form theme
- ✅ Top toolbar with Save, Export, Preview, Share actions
- ✅ Interactive preview mode (real form renderer)
- ✅ Back navigation to dashboard

#### 2. Core Field Types (12/12 implemented)
- ✅ Short Text (single-line input)
- ✅ Long Text (textarea)
- ✅ Number (numeric input with validation)
- ✅ Email (email address with validation)
- ✅ Phone Number (phone input)
- ✅ Date (date picker)
- ✅ Dropdown (select with options)
- ✅ Checkbox (multiple selections)
- ✅ Star Rating (1-5 stars, configurable)
- ✅ File Upload (accepted types and size limits, backend storage)
- ✅ Signature Capture (draw or type)
- ✅ Page Break (multi-page forms)

#### 3. Field Management
- ✅ Drag-and-drop reordering of fields
- ✅ Click-to-select fields for editing
- ✅ Duplicate/copy fields
- ✅ Delete fields with confirmation
- ✅ Real-time label editing in canvas

#### 4. Field Configuration
- ✅ Field label/title
- ✅ Placeholder text
- ✅ Help text/description
- ✅ Required field toggle
- ✅ Character limits (min/max) for text fields
- ✅ Value constraints (min/max) for number fields
- ✅ Options management for select/checkbox fields
- ✅ Conditional logic (show/hide based on other answers)
- ✅ Page break configuration

#### 5. Form Dashboard
- ✅ Grid view of all forms
- ✅ Search functionality
- ✅ Statistics panel (total forms, active forms, total fields)
- ✅ Form cards with metadata
- ✅ Quick actions (Edit, Delete, Share, View Submissions)
- ✅ Create new form functionality

#### 6. Form Publishing & Sharing
- ✅ Unique form URL generation (`/form/:formId`)
- ✅ Share button with clipboard copy
- ✅ Visual feedback when link copied
- ✅ Reserved path system to prevent conflicts

#### 7. Public Form Renderer
- ✅ Clean, modern form display at `/form/:formId`
- ✅ All field types supported in public view
- ✅ Client-side form validation
- ✅ Required field validation
- ✅ Email format validation
- ✅ Number range validation
- ✅ Character limit validation
- ✅ Loading states
- ✅ Success confirmation page
- ✅ Error handling (form not found)
- ✅ Mobile responsive design
- ✅ Accessibility (ARIA labels, keyboard navigation, screen reader support)

#### 8. Submission Management
- ✅ Table view of submissions
- ✅ Search and filter functionality
- ✅ Sort by any column
- ✅ Individual submission detail modal
- ✅ Delete submissions with confirmation
- ✅ Statistics dashboard (total, today, this week)
- ✅ CSV export functionality using PapaParse
- ✅ Filter submissions by form
- ✅ Connected to real submission data
- ⚠️ Note: Not connected to backend; stored locally

#### 9. State Management
- ✅ Zustand store for form state
- ✅ Multiple forms support
- ✅ Current form tracking
- ✅ CRUD operations for forms (synced to backend)
- ✅ Field-level state management
- ✅ Submission management (synced to backend)
- ✅ Backend database persistence via Prisma
- ✅ localStorage fallback for offline/unauthenticated use

#### 10. Form Design & Theming
- ✅ Custom primary, button, background, and text colors
- ✅ Font family selection
- ✅ Custom submit button text
- ✅ Custom thank you title and message
- ✅ Optional redirect URL after submission
- ✅ Optional progress bar and question numbers

#### 11. Analytics
- ✅ Total submissions, today, this week, and average per day
- ✅ Submissions over time chart (SVG)
- ✅ Field-level completion rates
- ✅ Form and date range filters

#### 12. UI/UX Best Practices
- ✅ Accessibility compliance (WCAG AA standards)
- ✅ Touch targets (minimum 44px)
- ✅ Focus states and keyboard navigation
- ✅ ARIA labels and screen reader support
- ✅ Color contrast compliance
- ✅ Responsive design
- ✅ Loading states and error handling
- ✅ Visual feedback for user actions

#### 11. Web Builder Integration
- ✅ Reserved path system for form URLs
- ✅ Validation to prevent conflicts
- ✅ Separate grouping of reserved vs regular pages
- ✅ Visual indicators for reserved paths
- ✅ Auto-detection of reserved slugs

### 🚧 Partially Implemented

#### Form Submission
- ✅ Frontend validation and UI flow
- ✅ Loading states and success messages
- ✅ Local storage of submissions (with form persistence)
- ❌ Backend API integration
- ❌ Database persistence

#### Form Persistence
- ✅ In-memory state management
- ✅ localStorage persistence
- ❌ Backend database storage

### ✅ Newly Implemented

#### Conditional Logic
- ✅ Show/hide fields based on other field answers
- ✅ Rule builder with field selector, operator, and value
- ✅ AND/OR logic between multiple conditions
- ✅ Supported operators: equals, not equals, contains, greater than, less than, is empty, is not empty
- ✅ Real-time evaluation in the public form renderer
- ✅ Hidden fields are excluded from validation and submission data

#### Form Theming
- ✅ Customizable primary, button, background, and text colors
- ✅ Font family selection
- ✅ Custom submit button text
- ✅ Custom thank you title and message
- ✅ Optional redirect URL after submission
- ✅ Optional progress bar and question numbers
- ✅ Theme applied to public form renderer

#### Advanced Field Types
- ✅ Star Rating (configurable 2-10 stars)
- ✅ File Upload (accepted types and max size limits, backend upload storage)
- ✅ Signature Capture (draw or type)

#### Multi-page Forms
- ✅ Page Break field type
- ✅ Multi-page rendering in public form and preview
- ✅ Per-page validation and Next/Previous navigation
- ✅ Page-based progress bar

#### Interactive Builder Preview
- ✅ Builder preview uses real form renderer
- ✅ Conditional logic and theming are testable in the builder
- ✅ Preview submission validates without saving

#### Form Analytics Dashboard
- ✅ Submission totals and trends
- ✅ Simple SVG line chart for submissions over time
- ✅ Field completion rates
- ✅ Form selector and date range filters

#### Backend Integration
- ✅ REST API for form CRUD operations
- ✅ REST API for form submissions
- ✅ Database persistence via Prisma Form and FormSubmission models
- ✅ Public form retrieval endpoint
- ✅ Authenticated admin endpoints
- ✅ Local disk file upload endpoint (with static file serving)
- ✅ Client sync with backend (API first, localStorage fallback)

### ❌ Not Yet Implemented

#### Advanced Features
- ❌ Collaboration features
- ❌ Integration webhooks
- ❌ API key management
- ❌ Rate limiting and security hardening
- ❌ Azure Blob Storage migration for file uploads

### 📝 Technical Notes

#### File Structure
```
client/src/pages/forms/
├── FormsBuilder.jsx          # Main form builder interface
├── FormsDashboard.jsx        # Form list and management
├── Submissions.jsx           # Submission viewing and export
├── FormAnalytics.jsx         # Form analytics dashboard
├── components/
│   ├── FormCanvas.jsx        # Drag-and-drop canvas
│   ├── FormRenderer.jsx      # Shared public/preview form renderer
│   ├── FieldPalette.jsx      # Field type selector
│   └── PropertiesPanel.jsx   # Field configuration and form theme settings
├── store/
│   └── formStore.js          # Zustand state management with backend sync
├── utils/
│   └── conditionalLogic.js   # Conditional show/hide evaluation engine
├── api/
│   └── formsApi.js           # Backend API client
```

```
server/src/
├── controllers/forms.js      # Form and submission CRUD + file upload
├── routes/forms.js           # Form API routes
└── ...
```

#### Key Dependencies
- `@hello-pangea/dnd` - Drag and drop functionality
- `zustand` - State management
- `lucide-react` - Icons
- `papaparse` - CSV export
- `react-router-dom` - Routing
- `axios` - HTTP client
- `multer` - File upload handling (server)

#### Known Issues
- Backend API requires a running SQL Server database to persist data
- File uploads are stored on local disk and should be migrated to Azure Blob Storage for production
- Signature canvas is cleared on form re-render
- Reserved path detection works but needs backend validation
- Some console.log statements remain for debugging
- Form analytics does not track form views or device breakdown yet

#### Next Steps
1. Harden backend endpoints with rate limiting and input validation
2. Migrate file uploads to Azure Blob Storage
3. Add form view tracking and conversion analytics
4. Add email/webhook notifications on new submissions
5. Implement form templates and cloning
6. Add user roles and permissions for form access

---

*This document is a living guide and will be updated as the Forms sub app evolves.*
