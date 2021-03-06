$("#sigTable tbody").on("dblclick", "tr", {mode: "update"}, openSignatureDialog);
$("#add-signature").click({mode: "add"}, openSignatureDialog);

function openSignatureDialog(e) {
	e.preventDefault();
	mode = e.data.mode;

	if (mode == "update") {
		$("#sigTable tr.selected").removeClass("selected");
		$(this).closest("tr").addClass("selected");
	}

	if (!$("#dialog-signature").hasClass("ui-dialog-content")) {
		$("#dialog-signature").dialog({
			autoOpen: true,
			resizable: false,
			dialogClass: "dialog-noeffect ui-dialog-shadow",
			position: {my: "center", at: "center", of: $("#signaturesWidget")},
			buttons: {
				Save: function() {
					$("#form-signature").submit();
				},
				Add: function() {
					$("#form-signature").submit();
				},
				Cancel: function() {
					$(this).dialog("close");
				}
			},
			create: function() {
				var aSigWormholes = $.map(tripwire.wormholes, function(item, index) { return index;});
				aSigWormholes.splice(26, 0, "K162");
				aSigWormholes.push("GATE");

				$("#dialog-signature [name='signatureType'], #dialog-signature [name='signatureLife']").selectmenu({width: 100});
				$("#dialog-signature [name='wormholeLife'], #dialog-signature [name='wormholeMass']").selectmenu({width: 80});
				$("#dialog-signature [data-autocomplete='sigSystems']").inlinecomplete({source: tripwire.aSigSystems, maxSize: 10, delay: 0});
				$("#dialog-signature [data-autocomplete='sigType']").inlinecomplete({source: aSigWormholes, maxSize: 10, delay: 0});

				$("#dialog-signature #durationPicker").durationPicker();

				// Ensure first signature ID field only accepts letters
				$("#dialog-signature [name='signatureID_Alpha'], #dialog-signature [name='signatureID2_Alpha']").on("input", function() {
					while (!/^[a-zA-Z?]*$/g.test(this.value)) {
						this.value = this.value.substring(0, this.value.length -1);
					}
				});

				// Ensure second signature ID field only accepts numbers
				$("#dialog-signature [name='signatureID_Numeric'], #dialog-signature [name='signatureID2_Numeric']").on("input", function() {
					while (!/^[0-9?]*$/g.test(this.value)) {
						this.value = this.value.substring(0, this.value.length -1);
					}
				});

				// Select value on click
				$("#dialog-signature .signatureID, #dialog-signature .wormholeType").on("click", function() {
					$(this).select();
				});

				// Auto fill opposite side wormhole w/ K162
				$("#dialog-signature .wormholeType").on("input, change", function() {
					if (this.value.length > 0 && $.inArray(this.value, aSigWormholes) != -1 && this.value != "K162") {
						$("#dialog-signature .wormholeType").not(this).val("K162");

						// Also auto calculate duration
						if (tripwire.wormholes[this.value]) {
							$("#dialog-signature #durationPicker").val(tripwire.wormholes[this.value].life.substring(0, 2) * 60 * 60).change();
						}
					}
				});

				// Toggle between wormhole and regular signatures
				$("#dialog-signature").on("selectmenuchange", "[name='signatureType']", function() {
					if (this.value == "wormhole") {
						$("#dialog-signature #site").slideUp(200, function() { $(this).hide(0); });
						$("#dialog-signature #wormhole").slideDown(200, function() { $(this).show(200); });
					} else {
						$("#dialog-signature #site").slideDown(200, function() { $(this).show(200); });
						$("#dialog-signature #wormhole").slideUp(200, function() { $(this).hide(0); });
					}

					ValidationTooltips.close();
				});

				$("#form-signature").submit(function(e) {
					e.preventDefault();
					var form = $(this).serializeObject();
					var valid = true;
					ValidationTooltips.close();

					// Validate full signature ID fields (blank | 3 characters)
					$.each($("#dialog-signature .signatureID:visible"), function() {
						if ($(this).val().length > 0 && $(this).val().length < 3) {
							ValidationTooltips.open({target: $(this)}).setContent("Must be 3 characters in length!");
							$(this).select();
							valid = false;
							return false;
						}
					});
					if (!valid) return false;

					// Validate life length (> 5 minutes)
					if (isNaN(parseInt($("#dialog-signature #durationPicker").val())) || !(parseInt($("#dialog-signature #durationPicker").val()) >= 300)) {
						ValidationTooltips.open({target: $("#dialog-signature #durationPicker + .bdp-input")}).setContent("Must be at least 5 minutes!");
						$("#dialog-signature #durationPicker").select();
						return false;
					}

					// Validate wormhole types (blank | wormhole)
					$.each($("#dialog-signature .wormholeType:visible"), function() {
						if ($(this).val().length > 0 && $.inArray($(this).val(), aSigWormholes) == -1) {
							ValidationTooltips.open({target: $(this)}).setContent("Must be a valid wormhole type!");
							$(this).select();
							valid = false;
							return false;
						}
					});
					if (!valid) return false;

					// Validate first leads to (system)
					if ($("#dialog-signature .leadsTo:visible")[0] && $.inArray($("#dialog-signature .leadsTo:visible:first").val(), tripwire.aSigSystems) == -1) {
						ValidationTooltips.open({target: $("#dialog-signature .leadsTo:visible:first")}).setContent("Must be a valid leads to system!");
						$(this).select();
						return false;
					}

					// Validate leads to system (blank | system)
					$.each($("#dialog-signature .leadsTo:visible"), function() {
						if ($(this).val().length > 0 && $.inArray($(this).val(), tripwire.aSigSystems) == -1) {
							ValidationTooltips.open({target: $(this)}).setContent("Must be a valid leads to system!");
							$(this).select();
							valid = false;
							return false;
						}
					});
					if (!valid) return false;

					// console.log(form);

					var payload = {};
					var undo = [];
					if (form.signatureType === "wormhole") {
						var signature = {
							"signatureID": form.signatureID_Alpha + form.signatureID_Numeric,
							"systemID": viewingSystemID,
							"type": "wormhole",
							"name": form.wormholeName,
							"lifeLength": form.signatureLength
						};
						var signature2 = {
							"signatureID": form.signatureID2_Alpha + form.signatureID2_Numeric,
							"systemID": Object.index(tripwire.systems, "name", form.leadsTo) ? Object.index(tripwire.systems, "name", form.leadsTo) : $.inArray(form.leadsTo, tripwire.aSigSystems),
							"type": "wormhole",
							"name": form.wormholeName2,
							"lifeLength": form.signatureLength
						};
						var wormhole = {
							"type": tripwire.wormholes[form.wormholeType] ? form.wormholeType : (tripwire.wormholes[form.wormholeType2] ? form.wormholeType2 : ""),
							"life": form.wormholeLife,
							"mass": form.wormholeMass
						};

						if (mode == "update") {
							signature.id = $("#dialog-signature").data("signatureid");
							signature2.id = $("#dialog-signature").data("signature2id");
							wormhole.id = $("#dialog-signature").data("wormholeid");
							payload = {"signatures": {"update": [{"wormhole": wormhole, "signatures": [signature, signature2]}]}};

							if (tripwire.client.wormholes[wormhole.id]) {
									undo.push({"wormhole": tripwire.client.wormholes[wormhole.id], "signatures": [tripwire.client.signatures[signature.id], tripwire.client.signatures[signature2.id]]});
							} else {
									// used to be just a regular signature
									undo.push(tripwire.client.signatures[signature.id]);
							}
						} else {
							payload = {"signatures": {"add": [{"wormhole": wormhole, "signatures": [signature, signature2]}]}};
						}
					} else {
						if (mode == "update") {
							var signature = {
								"id": $("#dialog-signature").data("signatureid"),
								"signatureID": form.signatureID_Alpha + form.signatureID_Numeric,
								"systemID": viewingSystemID,
								"type": form.signatureType,
								"name": form.signatureName,
								"lifeLength": form.signatureLength
							};
							payload = {"signatures": {"update": [signature]}};
							undo.push(tripwire.client.signatures[signature.id]);
						} else {
							var signature = {
								"signatureID": form.signatureID_Alpha + form.signatureID_Numeric,
								"systemID": viewingSystemID,
								"type": form.signatureType,
								"name": form.signatureName,
								"lifeLength": form.signatureLength
							};
							payload = {"signatures": {"add": [signature]}};
						}
					}

					$("#dialog-signature").parent().find(":button:contains('Save')").button("disable");

					var success = function(data) {
						if (data.resultSet && data.resultSet[0].result == true) {
							$("#dialog-signature").dialog("close");

							$("#undo").removeClass("disabled");

							if (mode == "add") {
								undo = data.results;
							}
							if (viewingSystemID in tripwire.signatures.undo) {
								tripwire.signatures.undo[viewingSystemID].push({action: mode, signatures: undo});
							} else {
								tripwire.signatures.undo[viewingSystemID] = [{action: mode, signatures: undo}];
							}

							sessionStorage.setItem("tripwire_undo", JSON.stringify(tripwire.signatures.undo));
						}
					}

					var always = function() {
						$("#sigEditForm input[type=submit]").removeAttr("disabled");
						$("#dialog-signature").parent().find(":button:contains('Save')").button("enable");
					}

					tripwire.refresh('refresh', payload, success, always);
				});
			},
			open: function() {
				$("#dialog-signature input").val("");
				$("#dialog-signature [name='signatureType']").val("combat").selectmenu("refresh");

				$("#dialog-signature #site").show();
				$("#dialog-signature #wormhole").hide();

				// Side labels
				$("#dialog-signature .sideLabel:first").html(viewingSystem + " Side");
				$("#dialog-signature .sideLabel:last").html("Other Side");

				// Default signature life
				$("#dialog-signature #durationPicker").val(options.signatures.pasteLife * 60 * 60).change();

				if (mode == "update") {
					var id = $("#sigTable tr.selected").data("id");
					var signature = tripwire.client.signatures[id];
					$("#dialog-signature").data("signatureid", id);

					// Change the dialog buttons
					$("#dialog-signature").parent().find("button:contains('Add')").hide();
					$("#dialog-signature").parent().find("button:contains('Save')").show();

					// Change the dialog title
					$("#dialog-signature").dialog("option", "title", "Edit Signature");

					// console.log(signature);
					if (signature.type == "wormhole") {
						var wormhole = $.map(tripwire.client.wormholes, function(wormhole) { if (wormhole.parentID == id || wormhole.childID == id) return wormhole; })[0];
						var otherSignature = id == wormhole.parentID ? tripwire.client.signatures[wormhole.childID] : tripwire.client.signatures[wormhole.parentID];
						$("#dialog-signature").data("signature2id", otherSignature.id);
						$("#dialog-signature").data("wormholeid", wormhole.id);

						$("#dialog-signature input[name='signatureID_Alpha']").val(signature.signatureID ? signature.signatureID.substr(0, 3) : "???");
						$("#dialog-signature input[name='signatureID_Numeric']").val(signature.signatureID ? signature.signatureID.substr(3, 5) : "");
						$("#dialog-signature [name='signatureType']").val(signature.type).selectmenu("refresh").trigger("selectmenuchange");
						$("#dialog-signature [name='wormholeName']").val(signature.name);
						$("#dialog-signature #durationPicker").val(signature.lifeLength).change();
						$("#dialog-signature input[name='wormholeType']").val(wormhole.parentID == signature.id ? wormhole.type : 'K162');
						$("#dialog-signature [name='leadsTo']").val(tripwire.systems[otherSignature.systemID] ? tripwire.systems[otherSignature.systemID].name : (tripwire.aSigSystems[otherSignature.systemID] ? tripwire.aSigSystems[otherSignature.systemID] : ""));

						$("#dialog-signature input[name='signatureID2_Alpha']").val(otherSignature.signatureID ? otherSignature.signatureID.substr(0, 3) : "???");
						$("#dialog-signature input[name='signatureID2_Numeric']").val(otherSignature.signatureID ? otherSignature.signatureID.substr(3, 5) : "");
						$("#dialog-signature input[name='wormholeType2']").val(wormhole.parentID == otherSignature.id ? wormhole.type : 'K162');
						$("#dialog-signature [name='wormholeName2']").val(otherSignature.name);
						$("#dialog-signature [name='wormholeLife']").val(wormhole.life).selectmenu("refresh").trigger("selectmenuchange");
						$("#dialog-signature [name='wormholeMass']").val(wormhole.mass).selectmenu("refresh").trigger("selectmenuchange");
					} else {
						$("#dialog-signature input[name='signatureID_Alpha']").val(signature.signatureID.substr(0, 3));
						$("#dialog-signature input[name='signatureID_Numeric']").val(signature.signatureID.substr(3, 5));
						$("#dialog-signature [name='signatureType']").val(signature.type).selectmenu("refresh").trigger("selectmenuchange");
						$("#dialog-signature [name='signatureName']").val(signature.name);
						$("#dialog-signature #durationPicker").val(signature.lifeLength).change();
					}
				} else {
					// Change the dialog buttons
					$("#dialog-signature").parent().find("button:contains('Add')").show();
					$("#dialog-signature").parent().find("button:contains('Save')").hide();

					// Change the dialog title
					$("#dialog-signature").dialog("option", "title", "Add Signature");
				}
			},
			close: function() {
				ValidationTooltips.close();
				$("#sigTable tr.selected").removeClass("selected");
			}
		});
	} else if (!$("#dialog-signature").dialog("isOpen")) {
		$("#dialog-signature").dialog("open");
	}
};
