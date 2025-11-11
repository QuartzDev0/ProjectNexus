
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.content-section');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = link.dataset.section;

      navLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      link.classList.add('active');
      document.getElementById(targetSection).classList.add('active');
    });
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  });

  // Load dashboard stats
  async function loadStats() {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      
      if (data.success) {
        document.getElementById('activeSessions').textContent = data.stats.activeSessions;
        document.getElementById('totalRequests').textContent = data.stats.totalRequests.toLocaleString();
        document.getElementById('blockedIPs').textContent = data.stats.blockedIPs;
        document.getElementById('uptime').textContent = formatUptime(data.stats.uptime);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  // Maintenance mode toggle
  const maintenanceToggle = document.getElementById('maintenanceToggle');
  const maintenanceStatus = document.getElementById('maintenanceStatus');

  async function loadMaintenanceStatus() {
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      maintenanceToggle.checked = data.maintenanceMode;
      maintenanceStatus.textContent = data.maintenanceMode ? 'Enabled' : 'Disabled';
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  }

  maintenanceToggle.addEventListener('change', async () => {
    try {
      const res = await fetch('/api/admin/toggle-maintenance', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        maintenanceStatus.textContent = maintenanceToggle.checked ? 'Enabled' : 'Disabled';
        showNotification(data.message, 'success');
      }
    } catch (err) {
      console.error('Failed to toggle maintenance:', err);
      showNotification('Failed to toggle maintenance mode', 'error');
    }
  });

  // Quick actions
  document.getElementById('toggleMaintenance').addEventListener('click', () => {
    maintenanceToggle.click();
  });

  document.getElementById('clearCache').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear the cache?')) return;
    
    try {
      const res = await fetch('/api/admin/clear-cache', { method: 'POST' });
      const data = await res.json();
      showNotification(data.message, 'success');
    } catch (err) {
      showNotification('Failed to clear cache', 'error');
    }
  });

  document.getElementById('clearLogs').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear all logs? This cannot be undone.')) return;
    
    try {
      const res = await fetch('/api/admin/clear-logs', { method: 'POST' });
      const data = await res.json();
      showNotification(data.message, 'success');
      loadLogs();
    } catch (err) {
      showNotification('Failed to clear logs', 'error');
    }
  });

  // Load proxy method status
  async function loadProxySettings() {
    try {
      const res = await fetch('/api/admin/proxy-settings');
      const data = await res.json();
      
      if (data.success) {
        document.getElementById('basicMethod').checked = data.methods.basic;
        document.getElementById('advancedMethod').checked = data.methods.advanced;
      }
    } catch (err) {
      console.error('Failed to load proxy settings:', err);
    }
  }

  // Proxy methods
  document.getElementById('updateMethods').addEventListener('click', async () => {
    const basic = document.getElementById('basicMethod').checked;
    const advanced = document.getElementById('advancedMethod').checked;

    if (!basic && !advanced) {
      showNotification('At least one proxy method must be enabled', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/update-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basic, advanced })
      });
      const data = await res.json();
      showNotification(data.message, 'success');
    } catch (err) {
      showNotification('Failed to update methods', 'error');
    }
  });

  // Rate limiting
  document.getElementById('updateRateLimit').addEventListener('click', async () => {
    const limit = document.getElementById('rateLimit').value;

    try {
      const res = await fetch('/api/admin/update-rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: parseInt(limit) })
      });
      const data = await res.json();
      showNotification(data.message, 'success');
    } catch (err) {
      showNotification('Failed to update rate limit', 'error');
    }
  });

  // IP Blocking
  document.getElementById('blockIP').addEventListener('click', async () => {
    const ip = document.getElementById('ipToBlock').value.trim();
    if (!ip) return;

    try {
      const res = await fetch('/api/admin/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      
      if (data.success) {
        document.getElementById('ipToBlock').value = '';
        loadBlockedIPs();
        showNotification(data.message, 'success');
      } else {
        showNotification(data.error, 'error');
      }
    } catch (err) {
      showNotification('Failed to block IP', 'error');
    }
  });

  async function loadBlockedIPs() {
    try {
      const res = await fetch('/api/admin/blocked-ips');
      const data = await res.json();
      
      const list = document.getElementById('blockedIPList');
      list.innerHTML = '';
      
      if (data.ips && data.ips.length > 0) {
        data.ips.forEach(ip => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span>${ip}</span>
            <button onclick="unblockIP('${ip}')">Unblock</button>
          `;
          list.appendChild(li);
        });
      } else {
        list.innerHTML = '<li style="border: none; color: #666;">No blocked IPs</li>';
      }
    } catch (err) {
      console.error('Failed to load blocked IPs:', err);
    }
  }

  window.unblockIP = async (ip) => {
    try {
      const res = await fetch('/api/admin/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      const data = await res.json();
      
      if (data.success) {
        loadBlockedIPs();
        loadStats();
        showNotification(data.message, 'success');
      }
    } catch (err) {
      showNotification('Failed to unblock IP', 'error');
    }
  };

  // Domain Blocking
  document.getElementById('blockDomain').addEventListener('click', async () => {
    const domain = document.getElementById('domainToBlock').value.trim();
    if (!domain) return;

    try {
      const res = await fetch('/api/admin/block-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      const data = await res.json();
      
      if (data.success) {
        document.getElementById('domainToBlock').value = '';
        loadBlockedDomains();
        showNotification(data.message, 'success');
      } else {
        showNotification(data.error, 'error');
      }
    } catch (err) {
      showNotification('Failed to block domain', 'error');
    }
  });

  async function loadBlockedDomains() {
    try {
      const res = await fetch('/api/admin/blocked-domains');
      const data = await res.json();
      
      const list = document.getElementById('blockedDomainList');
      list.innerHTML = '';
      
      if (data.domains && data.domains.length > 0) {
        data.domains.forEach(domain => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span>${domain}</span>
            <button onclick="unblockDomain('${domain}')">Unblock</button>
          `;
          list.appendChild(li);
        });
      } else {
        list.innerHTML = '<li style="border: none; color: #666;">No blocked domains</li>';
      }
    } catch (err) {
      console.error('Failed to load blocked domains:', err);
    }
  }

  window.unblockDomain = async (domain) => {
    try {
      const res = await fetch('/api/admin/unblock-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      });
      const data = await res.json();
      
      if (data.success) {
        loadBlockedDomains();
        showNotification(data.message, 'success');
      }
    } catch (err) {
      showNotification('Failed to unblock domain', 'error');
    }
  };

  // Analytics
  async function loadAnalytics() {
    try {
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      
      if (data.success) {
        // Top sites
        const topSites = document.getElementById('topSites');
        topSites.innerHTML = '';
        data.topSites.forEach(site => {
          const li = document.createElement('li');
          li.innerHTML = `<span>${site.url}</span><span>${site.count} visits</span>`;
          topSites.appendChild(li);
        });

        // Geo stats
        const geoStats = document.getElementById('geoStats');
        geoStats.innerHTML = '';
        data.geoStats.forEach(stat => {
          const li = document.createElement('li');
          li.innerHTML = `<span>${stat.country}</span><span>${stat.count}</span>`;
          geoStats.appendChild(li);
        });

        // Bandwidth
        document.getElementById('totalBandwidth').textContent = formatBytes(data.bandwidth.total);
        document.getElementById('monthBandwidth').textContent = formatBytes(data.bandwidth.month);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Logs
  async function loadLogs() {
    try {
      const level = document.getElementById('logLevel').value;
      const search = document.getElementById('logSearch').value;
      
      const res = await fetch(`/api/admin/logs?level=${level}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      
      const container = document.getElementById('logContainer');
      container.innerHTML = '';
      
      if (data.logs && data.logs.length > 0) {
        data.logs.forEach(log => {
          const div = document.createElement('div');
          div.className = `log-entry ${log.level}`;
          div.innerHTML = `
            <span class="log-time">${log.timestamp}</span>
            <span class="log-level">${log.level}</span>
            <span class="log-message">${log.message}</span>
          `;
          container.appendChild(div);
        });
      } else {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No logs found</div>';
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }

  document.getElementById('refreshLogs').addEventListener('click', loadLogs);
  document.getElementById('logLevel').addEventListener('change', loadLogs);
  document.getElementById('logSearch').addEventListener('input', debounce(loadLogs, 500));

  // Security events
  async function loadSecurityEvents() {
    try {
      const res = await fetch('/api/admin/security-events');
      const data = await res.json();
      
      const container = document.getElementById('securityEvents');
      container.innerHTML = '';
      
      if (data.events && data.events.length > 0) {
        data.events.forEach(event => {
          const div = document.createElement('div');
          div.className = `event-item ${event.severity}`;
          div.innerHTML = `
            <span class="event-time">${event.timestamp}</span>
            <div>${event.message}</div>
          `;
          container.appendChild(div);
        });
      } else {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No security events</div>';
      }
    } catch (err) {
      console.error('Failed to load security events:', err);
    }
  }

  // Utility functions
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      border-radius: 6px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Initialize
  loadStats();
  loadMaintenanceStatus();
  loadProxySettings();
  loadBlockedIPs();
  loadBlockedDomains();
  loadAnalytics();
  loadLogs();
  loadSecurityEvents();

  // Refresh stats every 30 seconds
  setInterval(loadStats, 30000);
  setInterval(loadSecurityEvents, 60000);
});
