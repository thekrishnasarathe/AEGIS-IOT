#include <stdio.h>
#include <string.h>

int parse_ota_version(const char *header_line, char *ver_out, size_t ver_cap);

int main(int argc, char **argv) {
    char out[64] = {0};
    if (argc > 1 && strcmp(argv[1], "--crash") == 0) {
        const char *malformed_no_colon = "OTA_HEADER_CORRUPTED_NO_DELIMITER";
        int rc = parse_ota_version(malformed_no_colon, out, sizeof(out));
        printf("CRASH_TEST_Completed rc=%d out=%s\n", rc, out);
        return 0;
    }
    if (argc > 1 && strcmp(argv[1], "--bench") == 0) {
        for (int i = 0; i < 50000; i++) {
            parse_ota_version("FW_VER: 2.4.1", out, sizeof(out));
        }
        return 0;
    }
    int r1 = parse_ota_version("FW_VER: 2.4.1", out, sizeof(out));
    printf("B1:%d:%s\n", r1, out);
    int r2 = parse_ota_version("FW_VER: 3.0.0-rc1", out, sizeof(out));
    printf("B2:%d:%s\n", r2, out);
    int r3 = parse_ota_version("FW_VER:1.0.9", out, sizeof(out));
    printf("B3:%d:%s\n", r3, out);
    return 0;
}
