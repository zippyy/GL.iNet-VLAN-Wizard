'use strict';
'require view';
'require dom';
'require rpc';

var callStatus = rpc.declare({
	object: 'vlanwizard',
	method: 'status',
	expect: {}
});

var callApply = rpc.declare({
	object: 'vlanwizard',
	method: 'apply',
	params: [ 'configs', 'wifi_pass', 'save_profile', 'load_profile' ],
	expect: {}
});

var callConfirm = rpc.declare({
	object: 'vlanwizard',
	method: 'confirm',
	expect: {}
});

var callGetProfile = rpc.declare({
	object: 'vlanwizard',
	method: 'get_profile',
	params: [ 'name' ],
	expect: {}
});

function text(value) {
	return value == null ? '' : String(value);
}

function splitWords(value) {
	return text(value).trim().split(/\s+/).filter(Boolean);
}

function splitConfigs(configs) {
	return text(configs)
		.split('|')
		.filter(function(entry) { return entry !== ''; })
		.map(function(entry) {
			var parts = entry.split(';');

			return {
				vlan: text(parts[0]).trim(),
				ssid: parts.length > 1 ? text(parts[1]) : '',
				isolation: parts.length > 2 && text(parts[2]).trim() === 'y',
				untagged: parts.length > 3 ? text(parts.slice(3).join(';')).trim() : ''
			};
		});
}

function serializeConfigs(entries) {
	return entries.map(function(entry) {
		return [
			text(entry.vlan).trim(),
			text(entry.ssid),
			entry.isolation ? 'y' : 'n',
			text(entry.untagged).trim()
		].join(';');
	}).join('|');
}

function buildPreview(entries) {
	if (!entries.length)
		return _('No VLAN definitions yet.');

	return entries.map(function(entry) {
		return _('VLAN %s').format(entry.vlan || '?') +
			' | ' + _('Subnet 192.168.%s.0/24').format(entry.vlan || '?') +
			' | ' + _('Ports: %s').format(entry.untagged || _('trunk only')) +
			' | ' + _('SSID: %s').format(entry.ssid || _('none')) +
			' | ' + _('Isolation: %s').format(entry.isolation ? _('on') : _('off'));
	}).join('\n');
}

function collectRows(container) {
	return Array.from(container.querySelectorAll('.vlan-row')).map(function(row) {
		return {
			vlan: row.querySelector('[data-field="vlan"]').value,
			ssid: row.querySelector('[data-field="ssid"]').value,
			isolation: row.querySelector('[data-field="isolation"]').checked,
			untagged: row.querySelector('[data-field="untagged"]').value
		};
	});
}

function validateEntries(entries, ports, trunkPort) {
	var errors = [];
	var seenVlans = {};
	var usedPorts = {};

	entries.forEach(function(entry, index) {
		var label = _('Row %d').format(index + 1);
		var vlan = text(entry.vlan).trim();
		var ssid = text(entry.ssid);
		var untaggedPorts = splitWords(entry.untagged);

		if (!/^\d+$/.test(vlan)) {
			errors.push(_('%s: VLAN ID must be numeric.').format(label));
			return;
		}

		if (+vlan < 1 || +vlan > 4094)
			errors.push(_('%s: VLAN ID must be between 1 and 4094.').format(label));

		if (seenVlans[vlan])
			errors.push(_('%s: VLAN %s is duplicated.').format(label, vlan));

		seenVlans[vlan] = true;

		if (/[;|]/.test(ssid))
			errors.push(_('%s: SSID cannot contain ";" or "|".').format(label));

		untaggedPorts.forEach(function(port) {
			if (!/^\d+$/.test(port)) {
				errors.push(_('%s: Port "%s" is invalid.').format(label, port));
				return;
			}

			if (port === trunkPort) {
				errors.push(_('%s: Port %s is reserved as the tagged trunk port.').format(label, trunkPort));
				return;
			}

			if (ports.indexOf(port) === -1) {
				errors.push(_('%s: Port %s is not available on this device.').format(label, port));
				return;
			}

			if (usedPorts[port])
				errors.push(_('%s: Port %s is already untagged in VLAN %s.').format(label, port, usedPorts[port]));
			else
				usedPorts[port] = vlan;
		});
	});

	return errors;
}

function countWirelessEntries(entries) {
	return entries.filter(function(entry) {
		return text(entry.ssid).trim() !== '';
	}).length;
}

function countTrunkOnlyEntries(entries) {
	return entries.filter(function(entry) {
		return text(entry.untagged).trim() === '';
	}).length;
}

function renderHero(status, entries, trunkPort, ports, profiles) {
	var tips = [
		_('Each VLAN gets its own subnet, DHCP scope, firewall zone, and optional Wi-Fi SSID.'),
		_('LAN%s remains the tagged trunk port and cannot be assigned as an access port.').format(trunkPort),
		_('Use saved profiles to reapply repeatable layouts for Guest, IoT, cameras, or lab segments.')
	];
	var cards = [
		E('div', { 'class': 'wizard-stat-card' }, [
			E('span', { 'class': 'wizard-stat-label' }, _('Configured VLANs')),
			E('strong', { 'class': 'wizard-stat-value' }, String(entries.length))
		]),
		E('div', { 'class': 'wizard-stat-card' }, [
			E('span', { 'class': 'wizard-stat-label' }, _('Wi-Fi VLANs')),
			E('strong', { 'class': 'wizard-stat-value' }, String(countWirelessEntries(entries)))
		]),
		E('div', { 'class': 'wizard-stat-card' }, [
			E('span', { 'class': 'wizard-stat-label' }, _('Saved profiles')),
			E('strong', { 'class': 'wizard-stat-value' }, String(profiles.length))
		]),
		E('div', { 'class': 'wizard-stat-card' }, [
			E('span', { 'class': 'wizard-stat-label' }, _('Access ports')),
			E('strong', { 'class': 'wizard-stat-value' }, String(ports.length))
		])
	];

	return E('div', { 'class': 'wizard-shell vlan-shell' }, [
		E('span', { 'class': 'wizard-eyebrow' }, _('GL.iNet / OpenWrt')),
		E('h2', {}, _('VLAN Wizard')),
		E('p', {}, _('Build isolated wired and Wi-Fi VLANs from LuCI without hand-editing `network`, `dhcp`, `firewall`, and `wireless`. The wizard validates access-port conflicts up front and still keeps a rollback window after apply.')),
		E('ul', { 'class': 'wizard-tip-list' }, tips.map(function(tip) {
			return E('li', {}, tip);
		})),
		E('div', { 'class': 'wizard-stat-grid' }, cards),
		E('div', { 'class': 'wizard-meta-row' }, [
			E('div', { 'class': 'wizard-meta-card' }, [
				E('strong', {}, _('Switch mode')),
				E('span', {}, text(status.mode || _('unknown')))
			]),
			E('div', { 'class': 'wizard-meta-card' }, [
				E('strong', {}, _('Trunk port')),
				E('span', {}, _('LAN%s').format(trunkPort))
			]),
			E('div', { 'class': 'wizard-meta-card' }, [
				E('strong', {}, _('Wi-Fi radios')),
				E('span', {}, String((status.radios || []).length))
			]),
			E('div', { 'class': 'wizard-meta-card' }, [
				E('strong', {}, _('Rollback status')),
				E('span', {}, status.rollback_pending ? _('Pending confirmation') : _('Idle'))
			])
		])
	]);
}

return view.extend({
	load: function() {
		return callStatus();
	},

	render: function(status) {
		var root = E('div', { 'class': 'vlan-wizard-shell' });
		var heroMount = E('div');
		var rows = E('div', { 'class': 'vlan-rows' });
		var summaryBox = E('div', { 'class': 'wizard-section-note vlan-summary-note' });
		var saveProfile = E('input', {
			'class': 'cbi-input-text',
			'type': 'text',
			'placeholder': _('optional-profile-name')
		});
		var loadProfile = E('input', {
			'class': 'cbi-input-text',
			'type': 'text',
			'placeholder': _('existing-profile-name')
		});
		var wifiPass = E('input', {
			'class': 'cbi-input-password',
			'type': 'password',
			'placeholder': _('Wi-Fi password for any SSIDs you create')
		});
		var preview = E('pre', { 'class': 'vlan-preview' }, _('No VLAN definitions yet.'));
		var statusBox = E('div', { 'class': 'vlan-status-note' }, _('Ready.'));
		var keepButton;
		var ports = (status.lan_ports || []).map(String);
		var profiles = (status.profiles || []).map(String);
		var trunkPort = text(status.trunk_port || '4');

		function renderSummary(entries) {
			var wireless = countWirelessEntries(entries);
			var trunkOnly = countTrunkOnlyEntries(entries);

			if (!entries.length) {
				summaryBox.textContent = _('No VLANs are staged yet. Add a row to start building the layout.');
				return;
			}

			summaryBox.textContent = _('%s VLAN(s) staged | %s with Wi-Fi | %s trunk-only | %s detected radio(s)').format(
				entries.length,
				wireless,
				trunkOnly,
				(status.radios || []).length
			);
		}

		function renderHeroState(entries) {
			dom.content(heroMount, renderHero(status, entries, trunkPort, ports, profiles));
		}

		function refreshPreview() {
			var entries = collectRows(rows).filter(function(entry) {
				return text(entry.vlan).trim() !== '' || text(entry.ssid).trim() !== '' || text(entry.untagged).trim() !== '';
			});

			preview.textContent = buildPreview(entries);
			renderSummary(entries);
			renderHeroState(entries);
		}

		function setStatus(message, type) {
			statusBox.className = 'vlan-status-note' + (type ? ' ' + type : '');
			statusBox.textContent = message;
		}

		function addRow(entry) {
			entry = entry || { vlan: '', ssid: '', isolation: false, untagged: '' };

			var row = E('div', { 'class': 'vlan-row' }, [
				E('label', { 'class': 'vlan-field' }, [
					E('span', {}, _('VLAN ID')),
					E('input', {
						'class': 'cbi-input-text',
						'type': 'text',
						'data-field': 'vlan',
						'value': text(entry.vlan)
					})
				]),
				E('label', { 'class': 'vlan-field vlan-field-wide' }, [
					E('span', {}, _('SSID')),
					E('input', {
						'class': 'cbi-input-text',
						'type': 'text',
						'data-field': 'ssid',
						'value': text(entry.ssid),
						'placeholder': _('leave blank for wired-only VLAN')
					})
				]),
				E('label', { 'class': 'vlan-field' }, [
					E('span', {}, _('Untagged ports')),
					E('input', {
						'class': 'cbi-input-text',
						'type': 'text',
						'data-field': 'untagged',
						'value': text(entry.untagged),
						'placeholder': _('example: 1 2')
					})
				]),
				E('label', { 'class': 'vlan-checkbox' }, [
					E('input', {
						'type': 'checkbox',
						'data-field': 'isolation',
						'checked': !!entry.isolation
					}),
					E('span', {}, _('Client isolation'))
				]),
				E('button', {
					'class': 'btn cbi-button cbi-button-remove',
					'click': function(ev) {
						ev.preventDefault();
						row.remove();
						refreshPreview();
					}
				}, [ _('Remove') ])
			]);

			Array.from(row.querySelectorAll('input')).forEach(function(input) {
				input.addEventListener('input', refreshPreview);
				input.addEventListener('change', refreshPreview);
			});

			rows.appendChild(row);
			refreshPreview();
		}

		function loadProfileIntoForm(name) {
			if (!name)
				return Promise.resolve();

			setStatus(_('Loading profile "%s"...').format(name));

			return callGetProfile(name).then(function(reply) {
				if (!reply || reply.ok !== true) {
					setStatus(text(reply && reply.message) || _('Profile load failed.'), 'error');
					return;
				}

				rows.innerHTML = '';
				splitConfigs(reply.configs || '').forEach(addRow);
				wifiPass.value = text(reply.wifi_pass || '');
				loadProfile.value = name;
				if (!rows.children.length)
					addRow();
				setStatus(_('Loaded profile "%s".').format(name), 'success');
			}).catch(function(err) {
				setStatus(_('Profile load failed: %s').format(err.message || err), 'error');
			});
		}

		function applyChanges() {
			var entries = collectRows(rows).filter(function(entry) {
				return text(entry.vlan).trim() !== '' || text(entry.ssid).trim() !== '' || text(entry.untagged).trim() !== '';
			});
			var errors = validateEntries(entries, ports, trunkPort);
			var needsWifi = entries.some(function(entry) { return text(entry.ssid).trim() !== ''; });

			if (!entries.length)
				errors.unshift(_('Add at least one VLAN row before applying.'));

			if (needsWifi && text(wifiPass.value).trim() === '')
				errors.push(_('A Wi-Fi password is required when any VLAN has an SSID.'));

			if (errors.length) {
				setStatus(errors.join(' '), 'error');
				return;
			}

			setStatus(_('Applying VLAN changes. Network services will restart if validation passes...'));

			callApply(
				serializeConfigs(entries),
				wifiPass.value,
				text(saveProfile.value).trim(),
				''
			).then(function(reply) {
				if (!reply || reply.ok !== true) {
					setStatus(text(reply && reply.message) || _('Apply failed.'), 'error');
					return;
				}

				keepButton.disabled = !reply.rollback_pending;
				setStatus(
					(reply.message || _('Applied successfully.')) +
					(reply.backup ? ' ' + _('Backup: %s').format(reply.backup) : '') +
					(reply.warnings ? ' ' + reply.warnings : ''),
					'success'
				);
			}).catch(function(err) {
				setStatus(_('Apply failed: %s').format(err.message || err), 'error');
			});
		}

		keepButton = E('button', {
			'class': 'btn cbi-button cbi-button-save',
			'disabled': !status.rollback_pending,
			'click': function(ev) {
				ev.preventDefault();
				callConfirm().then(function(reply) {
					keepButton.disabled = true;
					setStatus(reply && reply.message ? reply.message : _('Rollback cancelled. Configuration kept.'), 'success');
				}).catch(function(err) {
					setStatus(_('Keep configuration failed: %s').format(err.message || err), 'error');
				});
			}
		}, [ _('Keep configuration') ]);

		root.appendChild(E('style', {}, [
			'.vlan-wizard-shell{display:block}',
			'.wizard-shell{margin-bottom:24px;padding:24px;border-radius:18px;background:linear-gradient(135deg,#14324a 0%,#155e75 55%,#d8c16a 100%);color:#fff;box-shadow:0 14px 36px rgba(20,50,74,.18)}',
			'.wizard-eyebrow{display:inline-block;margin-bottom:10px;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.14);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}',
			'.wizard-shell h2{margin:0 0 8px;font-size:28px;line-height:1.1;color:#fff}',
			'.wizard-shell p{max-width:820px;margin:0;color:rgba(255,255,255,.92);font-size:14px;line-height:1.6}',
			'.wizard-tip-list{margin:14px 0 0;padding-left:18px;color:rgba(255,255,255,.92)}',
			'.wizard-tip-list li{margin:4px 0}',
			'.wizard-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:20px}',
			'.wizard-stat-card{padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.12);backdrop-filter:blur(4px)}',
			'.wizard-stat-label{display:block;margin-bottom:4px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.78)}',
			'.wizard-stat-value{font-size:18px;color:#fff}',
			'.wizard-meta-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:16px}',
			'.wizard-meta-card{padding:12px 14px;border-radius:14px;background:rgba(7,20,31,.22)}',
			'.wizard-meta-card strong{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.78)}',
			'.wizard-meta-card span{display:block;margin-top:4px;font-size:16px;color:#fff}',
			'.vlan-panel{margin-bottom:20px;padding:18px;border:1px solid #d8e3e7;border-radius:16px;background:#fff}',
			'.vlan-panel h3{margin:0 0 14px}',
			'.vlan-panel p{line-height:1.6}',
			'.wizard-section-note{margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#f3fbfc;border:1px solid #d0edf0;color:#24566a;line-height:1.5}',
			'.vlan-summary-note{margin-bottom:16px}',
			'.vlan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}',
			'.vlan-field{display:flex;flex-direction:column;gap:6px}',
			'.vlan-field-wide{grid-column:span 2}',
			'.vlan-checkbox{display:flex;align-items:center;gap:8px;padding-top:22px}',
			'.vlan-rows{display:flex;flex-direction:column;gap:14px}',
			'.vlan-row{display:grid;grid-template-columns:130px minmax(220px,1fr) 180px 150px 100px;gap:12px;align-items:start;padding:14px;border:1px solid #dfe8eb;border-radius:14px;background:linear-gradient(180deg,#fcfdfd 0%,#f7fafb 100%)}',
			'.vlan-row:hover{border-color:#c6d9df;box-shadow:0 8px 20px rgba(18,53,69,.06)}',
			'.vlan-field span,.vlan-checkbox span{font-size:12px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#315466}',
			'.vlan-preview{margin:0;padding:14px;border-radius:12px;background:#0f1f2b;color:#dce7ef;white-space:pre-wrap;line-height:1.6}',
			'.vlan-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}',
			'.vlan-status-note{margin-top:16px;padding:12px 14px;border-radius:12px;background:#edf7fb;border:1px solid #c9e4ef;color:#17475c;line-height:1.5}',
			'.vlan-status-note.success{background:#edf8ef;border-color:#cfe8d3;color:#245030}',
			'.vlan-status-note.error{background:#fff0f0;border-color:#f0cccc;color:#7a2020}',
			'.vlan-chip-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
			'.vlan-chip{padding:6px 10px;border-radius:999px;background:#eff5f7;color:#234352;font-size:12px;font-weight:600}',
			'@media (max-width: 900px){.vlan-row{grid-template-columns:1fr}.vlan-field-wide{grid-column:auto}.vlan-checkbox{padding-top:0}}'
		].join('')));

		root.appendChild(heroMount);

		root.appendChild(E('div', { 'class': 'vlan-panel' }, [
			E('h3', {}, _('Device context')),
			E('p', { 'class': 'wizard-section-note' }, _('Available LAN access ports are detected from the running device. Assign untagged ports with spaces such as "1 2". Leave SSID blank for a wired-only VLAN, or leave Untagged ports blank for a trunk-only VLAN carried only on LAN%s.').format(trunkPort)),
			E('div', { 'class': 'vlan-chip-list' }, ports.length ? ports.map(function(port) {
				return E('span', { 'class': 'vlan-chip' }, _('LAN%s').format(port));
			}) : [ E('span', { 'class': 'vlan-chip' }, _('No LAN ports detected')) ]),
			E('div', { 'class': 'vlan-chip-list' }, profiles.length ? profiles.map(function(name) {
				return E('span', { 'class': 'vlan-chip' }, name);
			}) : [ E('span', { 'class': 'vlan-chip' }, _('No saved profiles yet')) ])
		]));

		root.appendChild(E('div', { 'class': 'vlan-panel' }, [
			E('h3', {}, _('Profiles and Wi-Fi')),
			E('p', { 'class': 'wizard-section-note' }, _('Profiles store the staged VLAN layout and shared Wi-Fi password so you can reuse known-good setups. If any VLAN has an SSID, the apply action requires a Wi-Fi password.')),
			E('div', { 'class': 'vlan-grid' }, [
				E('label', { 'class': 'vlan-field' }, [
					E('span', {}, _('Load profile')),
					loadProfile
				]),
				E('label', { 'class': 'vlan-field' }, [
					E('span', {}, _('Save profile as')),
					saveProfile
				]),
				E('label', { 'class': 'vlan-field vlan-field-wide' }, [
					E('span', {}, _('Wi-Fi password')),
					wifiPass
				])
			]),
			E('div', { 'class': 'vlan-actions' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-action',
					'click': function(ev) {
						ev.preventDefault();
						loadProfileIntoForm(text(loadProfile.value).trim());
					}
				}, [ _('Load profile') ])
			])
		]));

		root.appendChild(E('div', { 'class': 'vlan-panel' }, [
			E('h3', {}, _('VLAN definitions')),
			summaryBox,
			rows,
			E('div', { 'class': 'vlan-actions' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-add',
					'click': function(ev) {
						ev.preventDefault();
						addRow();
					}
				}, [ _('Add VLAN') ])
			])
		]));

		root.appendChild(E('div', { 'class': 'vlan-panel' }, [
			E('h3', {}, _('Preview')),
			E('p', { 'class': 'wizard-section-note' }, _('Review the staged VLAN plan before apply. The backend still revalidates VLAN IDs, access-port conflicts, reserved trunk usage, and required Wi-Fi credentials before changing UCI config.')),
			preview,
			E('div', { 'class': 'vlan-actions' }, [
				E('button', {
					'class': 'btn cbi-button cbi-button-apply',
					'click': function(ev) {
						ev.preventDefault();
						applyChanges();
					}
				}, [ _('Apply VLAN changes') ]),
				keepButton
			]),
			statusBox
		]));

		addRow();
		refreshPreview();

		return root;
	}
});
