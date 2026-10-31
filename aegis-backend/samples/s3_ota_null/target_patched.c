#include <stdio.h>
#include <string.h>

// S3: OTA Firmware Header Key-Value Parser (Illustrative sample written by SIGMOID SQUAD)
// CWE-476 Fixed: Validates strchr pointer before dereferencing
int parse_ota_version(const char *header_line, char *ver_out, size_t ver_cap) {
    if (!header_line || !ver_out || ver_cap == 0) return -1;
    const char *colon = strchr(header_line, ':');
    if (colon == NULL) {
        snprintf(ver_out, ver_cap, "ERR:MALFORMED_HEADER");
        return -2;
    }
    const char *val_start = colon + 1;
    while (*val_start == ' ') {
        val_start++;
    }
    snprintf(ver_out, ver_cap, "VER=%s", val_start);
    return 0;
}
