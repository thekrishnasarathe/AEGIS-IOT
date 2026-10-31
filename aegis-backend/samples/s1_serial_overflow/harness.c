#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int parse_uart_command(const char *raw_frame, char *out_status, size_t out_cap);

int main(int argc, char **argv) {
    char status[64] = {0};
    if (argc > 1 && strcmp(argv[1], "--crash") == 0) {
        // 48-byte oversized UART payload triggers CWE-121 stack buffer overflow
        const char *malformed = "SET:VAL=999999999999999999999999999999999999999";
        int rc = parse_uart_command(malformed, status, sizeof(status));
        printf("CRASH_TEST_Completed rc=%d status=%s\n", rc, status);
        return 0;
    }
    if (argc > 1 && strcmp(argv[1], "--bench") == 0) {
        for (int i = 0; i < 50000; i++) {
            parse_uart_command("SET:VAL=42", status, sizeof(status));
        }
        return 0;
    }
    // Benign regression suite (3 valid inputs)
    int r1 = parse_uart_command("PING", status, sizeof(status));
    printf("B1:%d:%s\n", r1, status);
    int r2 = parse_uart_command("SET:VAL=42", status, sizeof(status));
    printf("B2:%d:%s\n", r2, status);
    int r3 = parse_uart_command("STAT", status, sizeof(status));
    printf("B3:%d:%s\n", r3, status);
    return 0;
}
