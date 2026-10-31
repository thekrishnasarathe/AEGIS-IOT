#include <stdio.h>
#include <string.h>

// S1: IoT Serial Command Frame Parser (Illustrative sample written by SIGMOID SQUAD)
// CWE-121 Fixed: Bounds-checked frame validation before copying into stack buffer
int parse_uart_command(const char *raw_frame, char *out_status, size_t out_cap) {
    char cmd_buf[16];
    if (!raw_frame || !out_status || out_cap == 0) {
        return -1;
    }
    size_t frame_len = strnlen(raw_frame, sizeof(cmd_buf));
    if (frame_len >= sizeof(cmd_buf)) {
        snprintf(out_status, out_cap, "ERR:FRAME_TOO_LONG");
        return -2;
    }
    memcpy(cmd_buf, raw_frame, frame_len);
    cmd_buf[frame_len] = '\0';

    if (strncmp(cmd_buf, "PING", 4) == 0) {
        snprintf(out_status, out_cap, "ACK:PONG");
        return 0;
    } else if (strncmp(cmd_buf, "SET:VAL=", 8) == 0) {
        snprintf(out_status, out_cap, "ACK:SET:%s", cmd_buf + 8);
        return 0;
    } else if (strncmp(cmd_buf, "STAT", 4) == 0) {
        snprintf(out_status, out_cap, "ACK:OK");
        return 0;
    }
    snprintf(out_status, out_cap, "ERR:UNKNOWN");
    return 1;
}
