# Inline Editor Testing Guide

## How to Test the New Inline Editor

1. **Access the Editor**
   - Navigate to `http://localhost:3000/web`
   - You should see the new inline editor interface

2. **Test Text Editing**
   - Click on any text element (titles, paragraphs, etc.)
   - The text should become editable with a blue border
   - Type new content and click away or press Enter to save
   - Look for the "Saved" confirmation message

3. **Test Block Management**
   - Hover over any block to see the blue outline and action toolbar
   - Try the toolbar buttons:
     - Move up/down arrows
     - Duplicate button
     - Style palette (opens style panel)
     - Delete button
   - Click "Add Block" button or use the "+" key

4. **Test Image Editing**
   - Click on any image or image placeholder
   - Use the dialog to:
     - Enter a new image URL
     - Upload a file (creates local URL)
     - Remove the image

5. **Test Button Editing**
   - Click on any button to edit text and link
   - The edit dialog should appear

6. **Test Styling**
   - Click the palette icon on any block
   - Try changing:
     - Background color
     - Text color
     - Padding and margins
     - Border settings
     - Text alignment

7. **Test Keyboard Shortcuts**
   - Press "?" to see the help modal
   - Try Ctrl+S to save
   - Try Ctrl+Z for undo
   - Try "+" to add a block
   - Try Esc to close dialogs

8. **Test Auto-Save**
   - Make changes and wait for the auto-save indicator
   - Check that changes persist after page refresh

9. **Test Responsive Preview**
   - Use the device buttons (desktop, tablet, mobile)
   - The layout should adapt accordingly

## Expected Behavior

✅ **Click-to-edit text** works smoothly  
✅ **Hover controls** appear on blocks  
✅ **Auto-save** shows visual feedback  
✅ **Drag-and-drop** reordering works  
✅ **Style panel** allows customization  
✅ **Keyboard shortcuts** function properly  
✅ **Accessibility** features are present (ARIA labels, keyboard navigation)  

## Known Issues to Fix

- [ ] Grid blocks need more sophisticated inline editing
- [ ] File upload should integrate with actual storage service
- [ ] Some block types may need additional inline controls
- [ ] Mobile touch interactions could be improved