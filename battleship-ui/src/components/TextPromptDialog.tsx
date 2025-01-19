import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';

export interface TextPromptDialogProps {
  prompt: string;
  isOpen: boolean;
  onCancel: () => void;
  onSubmit: (text: string) => void;
}

export const TextPromptDialog: React.FC<Readonly<TextPromptDialogProps>> = ({ prompt, isOpen, onCancel, onSubmit }) => {
  const [text, setText] = useState<string>('');

  return (
    <Dialog
      open={isOpen}
      onClose={onCancel}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        style: {
          backgroundColor: 'black',
          borderRadius: '8px',
          padding: '16px',
        },
      }}
    >
      <DialogTitle>
        <Typography variant="body1" color="cornsilk" data-testid="textprompt-dialog-title">
          {prompt}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <TextField
          id="text-prompt"
          variant="outlined"
          focused
          fullWidth
          size="small"
          color="primary"
          autoComplete="off"
          inputProps={{ style: { color: 'cornsilk' } }}
          onChange={(e) => {
            setText(e.target.value);
          }}
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-member-access
          inputRef={(input) => input?.focus()}
          data-testid="textprompt-dialog-text-prompt"
        />
      </DialogContent>

      <DialogActions>
        <Button variant="contained" data-testid="textprompt-dialog-cancel-btn" disableElevation onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          data-testid="textprompt-dialog-ok-btn"
          disabled={!text.length}
          disableElevation
          onClick={(_) => {
            onSubmit(text);
          }}
          type="submit"
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};
