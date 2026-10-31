#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// S2: IoT MQTT Telemetry Topic Extractor (Illustrative sample written by SIGMOID SQUAD)
// CWE-122 Fixed: Rejects declared_len exceeding allocated heap buffer capacity
int extract_mqtt_topic(const char *packet, size_t declared_len, char *out_buf, size_t out_cap) {
    if (!packet || !out_buf || out_cap < 8) return -1;
    const size_t MAX_TOPIC = 20;
    if (declared_len >= MAX_TOPIC) {
        snprintf(out_buf, out_cap, "ERR:LEN_OVERFLOW");
        return -3;
    }
    char *heap_topic = (char *)malloc(MAX_TOPIC);
    if (!heap_topic) return -2;

    memcpy(heap_topic, packet, declared_len);
    heap_topic[declared_len] = '\0';

    snprintf(out_buf, out_cap, "TOPIC:%s", heap_topic);
    free(heap_topic);
    return 0;
}
