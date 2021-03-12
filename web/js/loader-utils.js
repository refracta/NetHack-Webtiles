function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function waitFor(vf, t = 10) {
    return new Promise(r => {
        let i = setInterval(_ => {
            try {
                let v = vf();
                if (v) {
                    clearInterval(i);
                    r(v);
                }
            } catch (e) {
            }
        }, t);
    });
}