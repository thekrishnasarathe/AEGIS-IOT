#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// S2: IoT MQTT Telemetry Topic Extractor (Illustrative sample written by SIGMOID SQUAD)
// CWE-122: Heap-Based Buffer Overflow when payload_len exceeds allocated topic buffer
int extract_mqtt_topic(const char *packet, size_t declared_len, char *out_buf, size_t out_cap) {
    if (!packet || !out_buf || out_cap < 8) return -1;
    char *heap_topic = (char *)malloc(20);
    if (!heap_topic) return -2;

    // BUG: Copies declared_len bytes from packet into 20-byte heap buffer without bounds check
    memcpy(heap_topic, packet, declared_len);
    heap_topic[declared_len < 19 ? declared_len : 19] = '\0';

    snprintf(out_buf, out_cap, "TOPIC:%s", heap_topic);
    free(heap_topic);
    return 0;
}
