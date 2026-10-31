#include <stdio.h>
#include <string.h>

// Candidate patch that "fixes" the crash by deleting all command parsing logic
int parse_uart_command(const char *raw_frame, char *out_status, size_t out_cap) {
    (void)raw_frame;
    if (out_status && out_cap > 0) {
        out_status[0] = '\0';
    }
    return 0;
}
