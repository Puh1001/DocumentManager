# Brainstorm: Centralized Mount Architecture

**Date:** 2024-12-18  
**Context:** Mount SMB share trên Linux server, Dev Windows kết nối đến mount point đó

---

## Problem Statement

### Current Approach (Hybrid)

- **Development (Windows):** Kết nối trực tiếp đến SMB share (`\\10.0.60.30\Public`)
- **Production (Linux):** Mount SMB share trên mỗi server (`/mnt/smb`)

### Proposed Approach (Centralized)

- **Production (Linux):** Mount SMB share trên Linux server (`/mnt/smb`)
- **Development (Windows):** Kết nối đến mount point trên Linux server (qua network share)

### Question

**Tại sao không mount ở Linux và dev ở Windows cũng kết nối đến ổ mount ở server Linux để đồng bộ?**

---

## Architecture Analysis

### Current Architecture

```
┌─────────────┐                    ┌─────────────┐
│ Dev Windows │────────────────────▶│ SMB Share   │
│  (Direct)   │  \\10.0.60.30\...  │ 10.0.60.30  │
└─────────────┘                    └─────────────┘
                                              ▲
┌─────────────┐                              │
│ Prod Linux   │──────────────────────────────┘
│  (Mount)     │  /mnt/smb (mounted)
└─────────────┘
```

### Proposed Architecture (Centralized)

```
┌─────────────┐                    ┌─────────────┐
│ Dev Windows │───────────────────▶│ Linux Server│
│  (Network)  │  \\linux-server\   │  /mnt/smb   │
│             │    shared          │  (mounted)  │
└─────────────┘                    └──────┬──────┘
                                          │
                                          │ Mount
                                          ▼
                                   ┌─────────────┐
                                   │ SMB Share   │
                                   │ 10.0.60.30  │
                                   └─────────────┘
```

---

## Solution Options

### Option 1: Linux Server Re-export via Samba ⭐ **RECOMMENDED**

**Approach:** Linux server mount SMB share, sau đó re-export qua Samba để Windows clients access

**Setup:**

```bash
# 1. Mount SMB share trên Linux
sudo mount -t cifs //10.0.60.30/Public /mnt/smb \
  -o username=user,password=pass,domain=bestpacific.com

# 2. Install Samba
sudo apt-get install samba

# 3. Configure Samba để share /mnt/smb
# /etc/samba/smb.conf
[shared]
  path = /mnt/smb
  browseable = yes
  writable = yes
  valid users = dev-user
  force user = nobody
  force group = nogroup
```

**Dev Windows:**

```bash
# Map network drive
net use Z: \\linux-server-ip\shared /user:dev-user password
```

**Pros:**

- ✅ **Single mount point** - chỉ mount 1 lần trên Linux
- ✅ **Consistent path** - Dev và Prod dùng cùng source
- ✅ **Centralized management** - dễ quản lý
- ✅ **No direct SMB access needed** - Dev không cần access trực tiếp đến 10.0.60.30
- ✅ **Better for HA** - 2 Linux servers có thể share mount point

**Cons:**

- ❌ **Extra network hop** - Dev → Linux → SMB (performance overhead)
- ❌ **Dependency on Linux server** - Dev cần Linux server online
- ❌ **Samba configuration** - phải setup và maintain Samba
- ❌ **Security complexity** - phải manage 2 layers (SMB + Samba)
- ❌ **Latency** - thêm 1 hop network

**When to use:**

- Có Linux server luôn online
- Dev không có direct access đến SMB share
- Cần centralized management
- Có thể chấp nhận performance trade-off

---

### Option 2: Linux Server Re-export via NFS

**Approach:** Linux server mount SMB share, re-export qua NFS

**Setup:**

```bash
# 1. Mount SMB share
sudo mount -t cifs //10.0.60.30/Public /mnt/smb ...

# 2. Install NFS server
sudo apt-get install nfs-kernel-server

# 3. Export /mnt/smb
# /etc/exports
/mnt/smb dev-windows-ip(rw,sync,no_subtree_check)

# 4. Restart NFS
sudo systemctl restart nfs-kernel-server
```

**Dev Windows:**

- Cần NFS client (Windows 10+ có sẵn)
- Mount: `mount \\linux-server-ip\mnt\smb Z:`

**Pros:**

- ✅ **Standard protocol** - NFS là standard
- ✅ **Better performance** - NFS thường nhanh hơn Samba
- ✅ **Linux-native** - tốt cho Linux-to-Linux

**Cons:**

- ❌ **Windows NFS client** - có thể có issues
- ❌ **Permission mapping** - phức tạp hơn
- ❌ **Firewall** - cần mở NFS ports
- ❌ **Less common** - ít dùng hơn Samba

---

### Option 3: SSH/SFTP Access

**Approach:** Dev Windows dùng SFTP client để access files trên Linux server

**Setup:**

```bash
# Linux server: Mount SMB share
sudo mount -t cifs //10.0.60.30/Public /mnt/smb ...

# Enable SSH access
# Dev dùng SFTP client (WinSCP, FileZilla, etc.)
```

**Dev Windows:**

- SFTP client: `sftp://linux-server-ip/mnt/smb`
- Hoặc mount SFTP như drive (WinFsp + SSHFS-Win)

**Pros:**

- ✅ **Secure** - SSH encryption
- ✅ **Standard** - SFTP là standard protocol
- ✅ **No extra services** - chỉ cần SSH

**Cons:**

- ❌ **Not native file access** - không thể dùng `fs` module trực tiếp
- ❌ **Performance** - SFTP chậm hơn SMB/NFS
- ❌ **Complex integration** - cần SFTP library trong Node.js
- ❌ **Not suitable** - không phù hợp cho file operations

---

### Option 4: Hybrid with Fallback

**Approach:** Dev thử kết nối đến Linux server trước, fallback về direct SMB

```typescript
class SmbService {
  async detectStrategy() {
    // Try Linux server mount first
    try {
      await this.testLinuxServerMount();
      this.strategy = "linux-server";
      return;
    } catch {}

    // Fallback to direct SMB
    try {
      await this.testDirectSMB();
      this.strategy = "direct-smb";
      return;
    } catch {}

    throw new Error("No SMB access available");
  }
}
```

**Pros:**

- ✅ **Flexible** - có fallback
- ✅ **Resilient** - không phụ thuộc hoàn toàn vào Linux server

**Cons:**

- ❌ **Complex** - nhiều code paths
- ❌ **Inconsistent** - có thể dùng 2 sources khác nhau
- ❌ **Harder to debug** - khó biết đang dùng source nào

---

## Comparison Matrix

| Solution             | Setup Complexity     | Performance     | Security             | Dev Experience       | Score    |
| -------------------- | -------------------- | --------------- | -------------------- | -------------------- | -------- |
| **Samba Re-export**  | ⭐⭐⭐ Medium        | ⭐⭐⭐ Good     | ⭐⭐⭐⭐ Good        | ⭐⭐⭐⭐⭐ Excellent | **8/10** |
| **NFS Re-export**    | ⭐⭐⭐⭐ High        | ⭐⭐⭐⭐ Better | ⭐⭐⭐ Medium        | ⭐⭐⭐ Good          | **6/10** |
| **SSH/SFTP**         | ⭐⭐ Low             | ⭐⭐ Slow       | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐ Poor            | **4/10** |
| **Hybrid Fallback**  | ⭐⭐⭐⭐⭐ Very High | ⭐⭐⭐⭐ Good   | ⭐⭐⭐ Good          | ⭐⭐⭐⭐ Good        | **7/10** |
| **Current (Direct)** | ⭐⭐ Low             | ⭐⭐⭐⭐⭐ Best | ⭐⭐⭐⭐ Good        | ⭐⭐⭐⭐ Good        | **9/10** |

---

## Key Considerations

### 1. Performance Impact

**Current (Direct):**

```
Dev Windows → SMB Share (10.0.60.30)
Latency: ~5-10ms (direct)
```

**Proposed (Centralized):**

```
Dev Windows → Linux Server → SMB Share (10.0.60.30)
Latency: ~10-20ms (2 hops)
```

**Impact:**

- ⚠️ **+50-100% latency** - thêm 1 network hop
- ⚠️ **Bandwidth overhead** - data đi qua Linux server
- ⚠️ **Linux server becomes bottleneck** - tất cả dev traffic qua 1 server

### 2. Dependency & Availability

**Current:**

- Dev độc lập - không phụ thuộc vào Linux server
- Nếu Linux server down, dev vẫn work

**Proposed:**

- Dev phụ thuộc vào Linux server
- Nếu Linux server down → Dev không thể access files
- **Single point of failure**

### 3. Network Architecture

**Current:**

```
Dev Network ──┐
              ├──▶ SMB Share (10.0.60.30)
Prod Network ─┘
```

**Proposed:**

```
Dev Network ──▶ Linux Server ──▶ SMB Share (10.0.60.30)
Prod Network ──▶ Linux Server ──▶ SMB Share (10.0.60.30)
```

**Issues:**

- ⚠️ **All traffic through Linux server** - có thể overload
- ⚠️ **Network bandwidth** - Linux server phải handle cả dev + prod traffic
- ⚠️ **Firewall rules** - phải mở ports cho dev access

### 4. Development Experience

**Current:**

- Dev có direct access - nhanh, đơn giản
- Không cần Linux server online để develop

**Proposed:**

- Dev cần Linux server online
- Phải setup Samba/NFS
- Có thể chậm hơn (network hop)

### 5. High Availability

**Current (2 servers):**

```
Server 1 ──┐
           ├──▶ SMB Share (10.0.60.30)
Server 2 ──┘
```

**Proposed:**

```
Dev ──▶ Linux Server ──┐
                       ├──▶ SMB Share (10.0.60.30)
Server 1 ──────────────┘
Server 2 ──────────────┘
```

**Question:** Dev kết nối đến server nào? Load balancer?

---

## Recommended Approach

### **Option A: Keep Current (Direct Access) - RECOMMENDED**

**Rationale:**

1. **Better performance** - direct access, không có network hop
2. **No dependency** - Dev không phụ thuộc vào Linux server
3. **Simpler architecture** - ít components, ít points of failure
4. **Better for development** - Dev có full control, nhanh hơn

**When to use:**

- Dev có direct network access đến SMB share
- Performance là priority
- Muốn dev environment độc lập

### **Option B: Centralized Mount (Samba Re-export)**

**Rationale:**

1. **Consistent source** - Dev và Prod dùng cùng mount point
2. **Centralized management** - dễ quản lý
3. **Better for security** - Dev không cần direct SMB access

**When to use:**

- Dev không có direct access đến SMB share (firewall, network restrictions)
- Cần centralized management
- Có thể chấp nhận performance trade-off
- Linux server luôn online và reliable

---

## Hybrid Solution (Best of Both)

### Architecture

```
┌─────────────┐                    ┌─────────────┐
│ Dev Windows │───Option 1────────▶│ SMB Share   │
│             │  (Direct UNC)      │ 10.0.60.30  │
│             │                     └──────┬──────┘
│             │                            │
│             │───Option 2────────▶│ Linux Server│
│             │  (Samba Share)    │  /mnt/smb   │
└─────────────┘                    └─────────────┘

┌─────────────┐                    ┌─────────────┐
│ Prod Linux  │───────────────────▶│ SMB Share   │
│  (Mount)    │  /mnt/smb          │ 10.0.60.30  │
└─────────────┘                    └─────────────┘
```

### Implementation

**Development:**

- **Primary:** Direct UNC path (`\\10.0.60.30\Public\...`)
- **Fallback:** Linux server Samba share (`\\linux-server\shared\...`)
- **Auto-detect:** Thử direct trước, fallback nếu fail

**Production:**

- **Always:** Mount SMB share (`/mnt/smb`)
- **No change:** Giữ nguyên current approach

**Code:**

```typescript
@Injectable()
export class SmbService {
  private basePath: string;
  private strategy: "direct" | "linux-server";

  constructor(private config: ConfigService) {
    if (process.platform === "win32") {
      // Dev: Try direct first, fallback to Linux server
      const useLinuxServer = config.get<boolean>("SMB_USE_LINUX_SERVER", false);

      if (useLinuxServer) {
        const linuxServer = config.get<string>("SMB_LINUX_SERVER");
        this.basePath = `\\\\${linuxServer}\\shared`;
        this.strategy = "linux-server";
      } else {
        const server = config.get<string>("SMB_SERVER", "10.0.60.30");
        const share = config.get<string>("SMB_SHARE", "Public");
        const basePath = config.get<string>("SMB_BASE_PATH", "");
        this.basePath = `\\\\${server}\\${share}\\${basePath}`;
        this.strategy = "direct";
      }
    } else {
      // Prod: Always use mounted path
      this.basePath = config.get<string>("SMB_MOUNT_PATH", "/shared");
      this.strategy = "direct";
    }
  }
}
```

---

## Decision Matrix

| Scenario                         | Recommended Solution | Reason                          |
| -------------------------------- | -------------------- | ------------------------------- |
| **Dev có direct network access** | Direct UNC (Current) | Best performance, no dependency |
| **Dev không có direct access**   | Samba Re-export      | Centralized, secure             |
| **Dev cần flexibility**          | Hybrid (Auto-detect) | Best of both worlds             |
| **Production**                   | Mount SMB (Current)  | Standard, reliable              |

---

## Final Recommendation

### **Keep Current Approach với Optional Linux Server Access**

**Development:**

- **Default:** Direct UNC path (`\\10.0.60.30\Public\...`)
- **Optional:** Linux server Samba share (nếu không có direct access)
- **Config:** `SMB_USE_LINUX_SERVER=true` để enable

**Production:**

- **Always:** Mount SMB share trên mỗi server (`/mnt/smb`)
- **No change:** Giữ nguyên current approach

**Benefits:**

- ✅ **Best performance** - Dev dùng direct access (default)
- ✅ **Flexibility** - Có thể switch sang Linux server nếu cần
- ✅ **No dependency** - Dev không bắt buộc phụ thuộc Linux server
- ✅ **Consistent Prod** - Production giữ nguyên, đơn giản

**Setup Linux Server (Optional):**

- Chỉ setup nếu dev không có direct access
- Samba re-export `/mnt/smb` như network share
- Dev có thể map drive: `net use Z: \\linux-server\shared`

---

## Implementation Plan

### Phase 1: Keep Current (Direct Access)

- Dev Windows: Direct UNC paths
- Prod Linux: Mount SMB share

### Phase 2: Add Linux Server Option (Optional)

- Setup Samba trên Linux server (nếu cần)
- Add config option: `SMB_USE_LINUX_SERVER`
- Update SmbService với strategy detection

### Phase 3: High Availability

- 2 Linux servers mount chung SMB share
- Load balancer phía trước
- Dev có thể chọn server nào để connect

---

## Open Questions

1. **Dev network access:** Dev có direct network access đến `10.0.60.30` không?
2. **Linux server availability:** Linux server có luôn online không?
3. **Performance requirements:** Dev có cần performance cao không?
4. **Security requirements:** Có cần restrict dev access không?

---

## Next Steps

1. **Clarify requirements:** Dev có direct access không?
2. **Choose approach:** Direct (default) hoặc Centralized (optional)
3. **Implement:** SmbService với platform detection
4. **Test:** Verify trên Windows (dev) và Linux (prod)
5. **Document:** Update deployment guide

---

**Decision:** **Keep current approach (Direct access)** làm default, với **optional Linux server access** nếu cần. Đây là balance tốt nhất giữa performance, simplicity, và flexibility.
