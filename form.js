/**
 * FormManagerInput
 * @param {*} inputs 
 * @author BMW
 */
function FormManagerInput(obj) {
    this.value = "";
    this.required = obj.required;
    this.isChanged = false;
}
FormManagerInput.prototype.val = function (value) {
    if (typeof value === "undefined" || value === null) {
        return this.setValue(value);
    } else {
        return this.getValue();
    }
}
FormManagerInput.prototype.getValue = function () {
    return this.value;
}
FormManagerInput.prototype.setValue = function (value) {
    this.isChanged = true;
    return this.value = value;
}
FormManagerInput.prototype.isRequired = function () {
    return !!this.required;
}
FormManagerInput.prototype.isValid = function () {
    console.warn("FormManagerInput: isValid is not implemented", this);
    if (typeof this.getValue() === "string") {
        return this.getValue().trim().length > 0;
    }
    return !!this.getValue();
}


function FormManagerMessage() { }
FormManagerMessage.prototype.setMessage = function (msg) {
    return this.message = msg
}
FormManagerMessage.prototype.getMessage = function (msg) {
    return this.message
}

function FormManagerButton() { }

/**
 * FormManager
 * @param {*} inputs 
 */
function FormManager(inputs) {
    // this.$container;
    this.inputs = inputs || [];
    this.messages = [];
}

FormManager.Types = {};
FormManager.Messages = {};
FormManager.CONSTANTS = {
    GROUP: "_GROUP"
}
FormManager.addNewType = function (name, extendedClass, constructor, prototype) {
    FormManager.Types[name] = function () {
        extendedClass.apply(this, arguments);
        constructor.apply(this, arguments);
    };
    FormManager.Types[name].prototype = Object.create(extendedClass.prototype);
    FormManager.Types[name].prototype.constructor = FormManager.Types[name];
    Object.assign(FormManager.Types[name].prototype, prototype);
}

FormManager.addNewMessageType = function (name, extendedClass, constructor, prototype) {
    FormManager.Messages[name] = function () {
        extendedClass.apply(this, arguments);
        constructor.apply(this, arguments);
    };
    FormManager.Messages[name].prototype = Object.create(extendedClass.prototype);
    FormManager.Messages[name].prototype.constructor = FormManager.Messages[name];
    Object.assign(FormManager.Messages[name].prototype, prototype);
}
FormManager.prototype.getObjectsOfType = function (Type) {
    var _searchForTypeInObject = function (object, Type) {
        var result = {};
        Object.keys(object).forEach(function (key) {
            var input = object[key];
            if (key === FormManager.CONSTANTS.GROUP) {
                Object.assign(result, _searchForTypeInObject(input, Type));
            } else if (input instanceof Type) {
                result[key] = input;
            }
        })
        return result;
    }

    var allInputsObject = _searchForTypeInObject(this.inputs, Type);
    Object.setPrototypeOf(allInputsObject, {
        toArray: function () {
            var self = this;
            return Object.keys(this).map(function (key) {
                return self[key];
            })
        }
    })
    return allInputsObject;
}
FormManager.prototype.showMessage = function (template) {
    if (typeof template === "string") {
        var message = template;
        template = new FormManager.Messages.ERROR();
        template.setMessage(message)
    }
    this.messages.push(template);
    this.render();
}
FormManager.prototype.clearMessageOfType = function (Type) {
    this.messages = this.messages.filter(function (msg) { return !(msg instanceof Type) });
    setTimeout(function () {
        this.render();
    }, 1)
}

FormManager.prototype._onSubmit = function () {
    var self = this;
    var result = {}
    Object.keys(self.inputs).forEach(function (key) {
        var input = self.inputs[key];
        if (input instanceof FormManagerInput) {
            result[key] = input.getValue();
        }
    })
    self.onSubmit(result);
}

FormManager.prototype.onSubmit = function (result) {
    console.log("Form submitted", result)
}

FormManager.prototype.isValid = function () {
    return this.getObjectsOfType(FormManagerInput).toArray().reduce(function (isFormValid, input) {
        return isFormValid && input.isValid();
    }, true)
}

FormManager.prototype._render = function () {
    var self = this;
    var _renderInput = function (input) {
        if (input instanceof FormManagerInput) {
            return input.render(self);
        } else if (input instanceof FormManagerMessage) {
            return input.render(self);
        } else {
            // Type is unknown
            return input;
        }
    }
    var _renderObjectOfInput = function (inputs) {
        return $("<div class='form-group row'>")
            .append(
            Object.keys(inputs).map(function (keyInput) {
                var input = inputs[keyInput];
                return $("<div class='col-md-" + (Math.round(12 / Object.keys(inputs).length)) + "'>")
                    .append(_renderInput(input));
            })
            )
    }

    return $("<form>")
        .submit(function (e) {
            console.log("form submitted")
            e.preventDefault();
            self.clearMessageOfType(FormManager.Messages.ERROR);
            if (!self.isValid()) {
                return self.showMessage(new FormManager.Messages.ERROR({ message: "Veuillez verifier vos données" }));
            }
            self._onSubmit();
        })
        .change(function () {

            self.clearMessageOfType(FormManager.Messages.ERROR);
        })
        .append(
        $("<div class='messages'>").append(
            self.messages.map(function (msg) {
                return msg.render();
            })
        )
        )
        .append(Object.keys(self.inputs).map(function (keyInput) {
            var input = self.inputs[keyInput];
            if (keyInput === FormManager.CONSTANTS.GROUP) {
                return _renderObjectOfInput(input);
            } else {
                var one = {};
                one.keyInput = input;
                return _renderObjectOfInput(one);
            }
        })
        );
}

FormManager.prototype.render = function (callback) {
    if (callback) {
        this.attachCallback = callback;
        return this.attachCallback.apply(this, [this._render()])
    } else if (this.attachCallback) {
        return this.attachCallback.apply(this, [this._render()])
    }
    return this._render()
}

/**
 * Adding default Types
 */
FormManager.addNewType("TEXT_INPUT", FormManagerInput, function (obj) {
    Object.assign(this, obj);
}, {
        render: function () {
            var self = this;
            return $("<div>")
                .append('<label class="control-label">' + this.label + (this.isRequired() ? " *" : "") + "</label>")
                .append(
                $("<input class='form-control' style='border:1; width:" + (this.size || '250px') + "' type='text'>")
                    .change(function (e) { self.setValue(e.target.value) })
                    .val(this.value)
                );
        }
    });

FormManager.addNewType("VALIDATE_BUTTON", FormManagerButton, function (obj) {
    Object.assign(this, obj);
}, {
        render: function () {
            return $('<button class="dt-button">')
                .append(this.label)
                .click(this.onClick);
        }
    });

FormManager.addNewType("CANCEL_BUTTON", FormManagerButton, function (obj) {
    Object.assign(this, obj);
}, {
        render: function () {
            return $('<button class="dt-button">')
                .append(this.label)
                .click(this.onClick);
        }
    });

/**
 * Messages (Error, info, ...)
 */
FormManager.addNewMessageType("ERROR", FormManagerMessage, function (obj) {
    Object.assign(this, obj);
}, {
        render: function () {
            return $("<div class='container-fluid custom-error-message'>")
                .append($('<div class="col-sm-1 max-width icon-col text-center">')
                    .append('<span id="icon" class="icon fa fa-exclamation-circle">')
                )
                .append($('<div class="col-sm-10">').append(
                    $('<h5 id="title" class="title">').html(this.title),
                    $('<p id="message" class="message" style="line-height:15px"></p>').html(this.message)
                ))
        }
    })

FormManager.addNewMessageType("OBLIGATORY_INPUTS_PHRASE", FormManagerMessage, function (obj) {
    Object.assign(this, obj);
}, {
        render: function (formObject) {
            var inputs = formObject.getObjectsOfType(FormManagerInput).toArray();
            if (inputs.filter(function (input) {
                return (input.isRequired())
            }).length > 0) {
                return "Les champs indiqués par une * sont obligatoires.";
            }
            return "";
        }
    })