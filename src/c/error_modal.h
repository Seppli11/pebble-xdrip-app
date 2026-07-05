#pragma once

#include "errors.h"

// Show a full-screen error modal for the given error. Safe to call
// repeatedly: only one modal is shown at a time (later calls are ignored
// while a modal is already up). Auto-dismisses after 1 minute; can be
// dismissed early with the Back button.
void error_modal_show(ErrorCode error);

// Dismiss the modal immediately (no-op if none is showing).
void error_modal_dismiss(void);
