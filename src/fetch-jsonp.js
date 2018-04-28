const defaultOptions = {
    timeout: 5000,
    jsonpCallback: 'callback',
    jsonpCallbackFunction: null,
};

function newError(error) {
    var err = new Error(error.msg);
    err.name = err.name;
    return err
}

function generateCallbackFunction() {
    return `jsonp_${Date.now()}_${Math.ceil(Math.random() * 100000)}`;
}

function clearFunction(functionName) {
    try {
        delete window[functionName];
    } catch (e) {
        window[functionName] = undefined;
    }
}

function removeScript(scriptId) {
    const script = document.getElementById(scriptId);
    if (script) {
        document.getElementsByTagName('head')[0].removeChild(script);
    }
}

function fetchJsonp(_url, options = {}) {
    // to avoid param reassign
    let url = _url;
    const timeout = options.timeout || defaultOptions.timeout;
    const jsonpCallback = options.jsonpCallback || defaultOptions.jsonpCallback;

    let timeoutId;

    return new Promise((resolve, reject) => {
        const callbackFunction = options.jsonpCallbackFunction || generateCallbackFunction();
        const scriptId = `${jsonpCallback}_${callbackFunction}`;

        window[callbackFunction] = (response) => {
            resolve({
                ok: true,
                // keep consistent with fetch API
                json: () => Promise.resolve(response),
            });

            if (timeoutId) clearTimeout(timeoutId);

            removeScript(scriptId);

            clearFunction(callbackFunction);
        };

        // Check if the user set their own params, and if not add a ? to start a list of params
        url += (url.indexOf('?') === -1) ? '?' : '&';

        const jsonpScript = document.createElement('script');
        jsonpScript.setAttribute('src', `${url}${jsonpCallback}=${callbackFunction}`);
        if (options.charset) {
            jsonpScript.setAttribute('charset', options.charset);
        }
        jsonpScript.id = scriptId;
        document.getElementsByTagName('head')[0].appendChild(jsonpScript);

        timeoutId = setTimeout(() => {
            reject(newError({
                name: 'NETWORK_TIMEOUT',
                msg: `JSONP request to ${_url} timed out`
            }));

            clearFunction(callbackFunction);
            removeScript(scriptId);
            window[callbackFunction] = () => {
                clearFunction(callbackFunction);
            };
        }, timeout);

        // Caught if got 404/500
        jsonpScript.onerror = () => {
            reject(newError({
                name: 'NETWORK_ERROR',
                msg: `JSONP request to ${_url} failed`
            }));

            clearFunction(callbackFunction);
            removeScript(scriptId);
            if (timeoutId) clearTimeout(timeoutId);
        };
    });
}

export default fetchJsonp;