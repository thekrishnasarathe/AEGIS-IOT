#include <stdio.h>
#include <string.h>

int extract_mqtt_topic(const char *packet, size_t declared_len, char *out_buf, size_t out_cap);

int main(int argc, char **argv) {
    char out[64] = {0};
    if (argc > 1 && strcmp(argv[1], "--crash") == 0) {
        const char *oversized = "sensors/indore/ward12/drainage/node_99_water_level_overflow";
        int rc = extract_mqtt_topic(oversized, strlen(oversized), out, sizeof(out));
        printf("CRASH_TEST_Completed rc=%d out=%s\n", rc, out);
        return 0;
    }
    if (argc > 1 && strcmp(argv[1], "--bench") == 0) {
        for (int i = 0; i < 50000; i++) {
            extract_mqtt_topic("sensors/temp", 12, out, sizeof(out));
        }
        return 0;
    }
    int r1 = extract_mqtt_topic("sensors/temp", 12, out, sizeof(out));
    printf("B1:%d:%s\n", r1, out);
    int r2 = extract_mqtt_topic("grid/volt", 9, out, sizeof(out));
    printf("B2:%d:%s\n", r2, out);
    int r3 = extract_mqtt_topic("pump/state", 10, out, sizeof(out));
    printf("B3:%d:%s\n", r3, out);
    return 0;
}
