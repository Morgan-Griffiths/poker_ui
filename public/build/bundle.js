
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.22.2 */

    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (59:2) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let div3;
    	let div2;
    	let t1;
    	let span0;
    	let t4;
    	let div5;
    	let div4;
    	let t5;
    	let div13;
    	let div7;
    	let div6;
    	let span1;
    	let t7;
    	let input;
    	let t8;
    	let span2;
    	let div7_class_value;
    	let t11;
    	let div10;
    	let div8;
    	let span3;
    	let t13;
    	let div9;
    	let span4;
    	let div10_class_value;
    	let t15;
    	let div11;
    	let p0;
    	let t16;
    	let t17;
    	let hr;
    	let t18;
    	let p1;
    	let t21;
    	let div12;
    	let t22;
    	let div12_class_value;
    	let dispose;
    	let each_value_2 = /*dealerHand*/ ctx[5];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*community*/ ctx[7];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*playerHand*/ ctx[6];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block0 = !/*firstAction*/ ctx[10] && create_if_block_3(ctx);
    	let if_block1 = /*firstAction*/ ctx[10] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			span0 = element("span");
    			span0.textContent = `\$${/*pot*/ ctx[8]}`;
    			t4 = space();
    			div5 = element("div");
    			div4 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			div13 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			span1 = element("span");
    			span1.textContent = "$0";
    			t7 = space();
    			input = element("input");
    			t8 = space();
    			span2 = element("span");
    			span2.textContent = `\$${/*maxBet*/ ctx[12]}`;
    			t11 = space();
    			div10 = element("div");
    			div8 = element("div");
    			span3 = element("span");
    			span3.textContent = "Fold";
    			t13 = space();
    			div9 = element("div");
    			span4 = element("span");
    			span4.textContent = "Check";
    			t15 = space();
    			div11 = element("div");
    			p0 = element("p");
    			t16 = text(/*playerName*/ ctx[1]);
    			t17 = space();
    			hr = element("hr");
    			t18 = space();
    			p1 = element("p");
    			p1.textContent = `\$${/*bankRoll*/ ctx[4]}`;
    			t21 = space();
    			div12 = element("div");
    			if (if_block0) if_block0.c();
    			t22 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "id", "dealer");
    			attr_dev(div0, "class", "hand");
    			add_location(div0, file, 60, 6, 1527);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file, 59, 4, 1497);
    			attr_dev(div2, "id", "community");
    			attr_dev(div2, "class", "hand");
    			add_location(div2, file, 76, 6, 2004);
    			attr_dev(span0, "id", "pot");
    			add_location(span0, file, 83, 6, 2224);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file, 75, 4, 1974);
    			attr_dev(div4, "id", "player");
    			attr_dev(div4, "class", "hand");
    			add_location(div4, file, 86, 6, 2298);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file, 85, 4, 2268);
    			add_location(span1, file, 99, 10, 2749);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", /*maxBet*/ ctx[12]);
    			add_location(input, file, 100, 10, 2775);
    			add_location(span2, file, 101, 10, 2852);
    			attr_dev(div6, "class", "input-wrapper d-flex justify-center");
    			add_location(div6, file, 98, 8, 2689);
    			attr_dev(div7, "id", "bet-slider");
    			attr_dev(div7, "class", div7_class_value = "" + (/*playerActions*/ ctx[3] + " d-flex justify-center flex-wrap"));
    			add_location(div7, file, 95, 6, 2587);
    			add_location(span3, file, 106, 10, 3021);
    			attr_dev(div8, "class", "btn hover-effect");
    			add_location(div8, file, 105, 8, 2980);
    			add_location(span4, file, 109, 10, 3103);
    			attr_dev(div9, "class", "btn hover-effect");
    			add_location(div9, file, 108, 8, 3062);
    			attr_dev(div10, "class", div10_class_value = "left " + /*playerActions*/ ctx[3] + " actions d-flex align-center");
    			add_location(div10, file, 104, 6, 2909);
    			add_location(p0, file, 113, 8, 3231);
    			add_location(hr, file, 114, 8, 3259);
    			add_location(p1, file, 115, 8, 3274);
    			attr_dev(div11, "id", "player-info");
    			attr_dev(div11, "class", "d-flex column");
    			add_location(div11, file, 112, 6, 3156);
    			attr_dev(div12, "class", div12_class_value = "right " + /*playerActions*/ ctx[3] + " actions d-flex align-center");
    			add_location(div12, file, 117, 6, 3312);
    			attr_dev(div13, "class", "container d-flex justify-center flex-wrap");
    			add_location(div13, file, 94, 4, 2525);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div0, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div2, null);
    			}

    			append_dev(div3, t1);
    			append_dev(div3, span0);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			insert_dev(target, t5, anchor);
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div7);
    			append_dev(div7, div6);
    			append_dev(div6, span1);
    			append_dev(div6, t7);
    			append_dev(div6, input);
    			set_input_value(input, /*betAmount*/ ctx[2]);
    			append_dev(div6, t8);
    			append_dev(div6, span2);
    			append_dev(div13, t11);
    			append_dev(div13, div10);
    			append_dev(div10, div8);
    			append_dev(div8, span3);
    			append_dev(div10, t13);
    			append_dev(div10, div9);
    			append_dev(div9, span4);
    			append_dev(div13, t15);
    			append_dev(div13, div11);
    			append_dev(div11, p0);
    			append_dev(p0, t16);
    			append_dev(div11, t17);
    			append_dev(div11, hr);
    			append_dev(div11, t18);
    			append_dev(div11, p1);
    			append_dev(div13, t21);
    			append_dev(div13, div12);
    			if (if_block0) if_block0.m(div12, null);
    			append_dev(div12, t22);
    			if (if_block1) if_block1.m(div12, null);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "change", /*input_change_input_handler*/ ctx[19]),
    				listen_dev(input, "input", /*input_change_input_handler*/ ctx[19]),
    				listen_dev(div11, "click", /*toggleTurn*/ ctx[15], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*dealerHand, showdown*/ 544) {
    				each_value_2 = /*dealerHand*/ ctx[5];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*community*/ 128) {
    				each_value_1 = /*community*/ ctx[7];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*playerHand*/ 64) {
    				each_value = /*playerHand*/ ctx[6];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*betAmount*/ 4) {
    				set_input_value(input, /*betAmount*/ ctx[2]);
    			}

    			if (dirty & /*playerActions*/ 8 && div7_class_value !== (div7_class_value = "" + (/*playerActions*/ ctx[3] + " d-flex justify-center flex-wrap"))) {
    				attr_dev(div7, "class", div7_class_value);
    			}

    			if (dirty & /*playerActions*/ 8 && div10_class_value !== (div10_class_value = "left " + /*playerActions*/ ctx[3] + " actions d-flex align-center")) {
    				attr_dev(div10, "class", div10_class_value);
    			}

    			if (dirty & /*playerName*/ 2) set_data_dev(t16, /*playerName*/ ctx[1]);
    			if (!/*firstAction*/ ctx[10]) if_block0.p(ctx, dirty);
    			if (/*firstAction*/ ctx[10]) if_block1.p(ctx, dirty);

    			if (dirty & /*playerActions*/ 8 && div12_class_value !== (div12_class_value = "right " + /*playerActions*/ ctx[3] + " actions d-flex align-center")) {
    				attr_dev(div12, "class", div12_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks_2, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div5);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div13);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(59:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (47:32) 
    function create_if_block_1(ctx) {
    	let div2;
    	let h1;
    	let t1;
    	let ul;
    	let li0;
    	let div0;
    	let t3;
    	let li1;
    	let div1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Pick A Game";
    			t1 = space();
    			ul = element("ul");
    			li0 = element("li");
    			div0 = element("div");
    			div0.textContent = "Texas Hold 'Em";
    			t3 = space();
    			li1 = element("li");
    			div1 = element("div");
    			div1.textContent = "Omaha 5 Card";
    			add_location(h1, file, 48, 6, 1170);
    			attr_dev(div0, "class", "btn hover-effect");
    			add_location(div0, file, 51, 10, 1274);
    			add_location(li0, file, 50, 8, 1225);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file, 54, 10, 1397);
    			add_location(li1, file, 53, 8, 1347);
    			attr_dev(ul, "id", "game-menu");
    			add_location(ul, file, 49, 6, 1197);
    			attr_dev(div2, "class", "container text-center");
    			add_location(div2, file, 47, 4, 1128);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(div2, t1);
    			append_dev(div2, ul);
    			append_dev(ul, li0);
    			append_dev(li0, div0);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			append_dev(li1, div1);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(li0, "click", /*click_handler*/ ctx[17], false, false, false),
    				listen_dev(li1, "click", /*click_handler_1*/ ctx[18], false, false, false)
    			];
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(47:32) ",
    		ctx
    	});

    	return block;
    }

    // (37:2) {#if !game && !playerName}
    function create_if_block(ctx) {
    	let div3;
    	let h1;
    	let t1;
    	let div0;
    	let input;
    	let t2;
    	let div2;
    	let div1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Enter Your Name";
    			t1 = space();
    			div0 = element("div");
    			input = element("input");
    			t2 = space();
    			div2 = element("div");
    			div1 = element("div");
    			div1.textContent = "Play";
    			add_location(h1, file, 38, 6, 855);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "player-name");
    			add_location(input, file, 40, 8, 916);
    			attr_dev(div0, "id", "name-field");
    			add_location(div0, file, 39, 6, 886);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file, 43, 8, 1007);
    			attr_dev(div2, "class", "btn-wrapper");
    			add_location(div2, file, 42, 6, 973);
    			attr_dev(div3, "class", "container text-center");
    			add_location(div3, file, 37, 2, 813);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h1);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, input);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			if (remount) dispose();
    			dispose = listen_dev(div1, "click", /*setName*/ ctx[13], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(37:2) {#if !game && !playerName}",
    		ctx
    	});

    	return block;
    }

    // (63:10) {#if !showdown}
    function create_if_block_5(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = "images/cards/card_back.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Card Back");
    			add_location(img, file, 64, 14, 1674);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file, 63, 12, 1631);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(63:10) {#if !showdown}",
    		ctx
    	});

    	return block;
    }

    // (68:10) {#if showdown}
    function create_if_block_4(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[20] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[20]);
    			add_location(img, file, 69, 14, 1846);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file, 68, 12, 1803);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(68:10) {#if showdown}",
    		ctx
    	});

    	return block;
    }

    // (62:8) {#each dealerHand as card}
    function create_each_block_2(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = !/*showdown*/ ctx[9] && create_if_block_5(ctx);
    	let if_block1 = /*showdown*/ ctx[9] && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*showdown*/ ctx[9]) if_block1.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(62:8) {#each dealerHand as card}",
    		ctx
    	});

    	return block;
    }

    // (78:8) {#each community as card}
    function create_each_block_1(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[20] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[20]);
    			add_location(img, file, 79, 12, 2123);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file, 78, 10, 2082);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(78:8) {#each community as card}",
    		ctx
    	});

    	return block;
    }

    // (88:8) {#each playerHand as card}
    function create_each_block(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t = space();
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[20] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[20]);
    			add_location(img, file, 89, 12, 2415);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file, 88, 10, 2374);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(88:8) {#each playerHand as card}",
    		ctx
    	});

    	return block;
    }

    // (119:8) {#if !firstAction}
    function create_if_block_3(ctx) {
    	let div0;
    	let span0;
    	let t2;
    	let div1;
    	let span1;
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = `Call ${/*dealerBet*/ ctx[11]}`;
    			t2 = space();
    			div1 = element("div");
    			span1 = element("span");
    			t3 = text("Raise ");
    			t4 = text(/*betAmount*/ ctx[2]);
    			add_location(span0, file, 120, 12, 3456);
    			attr_dev(div0, "class", "btn hover-effect");
    			add_location(div0, file, 119, 10, 3413);
    			add_location(span1, file, 123, 12, 3556);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file, 122, 10, 3513);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, span0);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span1);
    			append_dev(span1, t3);
    			append_dev(span1, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*betAmount*/ 4) set_data_dev(t4, /*betAmount*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(119:8) {#if !firstAction}",
    		ctx
    	});

    	return block;
    }

    // (127:8) {#if firstAction}
    function create_if_block_2(ctx) {
    	let div;
    	let span;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text("Bet ");
    			t1 = text(/*betAmount*/ ctx[2]);
    			add_location(span, file, 128, 12, 3697);
    			attr_dev(div, "class", "btn hover-effect");
    			add_location(div, file, 127, 10, 3654);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*betAmount*/ 4) set_data_dev(t1, /*betAmount*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(127:8) {#if firstAction}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (!/*game*/ ctx[0] && !/*playerName*/ ctx[1]) return create_if_block;
    		if (!/*game*/ ctx[0] && /*playerName*/ ctx[1]) return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "id", "table");
    			add_location(div, file, 35, 0, 765);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let game = null;
    	let playerName = null;
    	let bankRoll = 1000;
    	let dealerHand = ["7D", "10H", "QS", "9H", "AD"];
    	let playerHand = ["5D", "JD", "QH", "2D", "AS"];
    	let community = ["AH", "KD", "JS", "2H", "7D"];
    	let pot = 0;
    	let showdown = false;
    	let firstAction = false;
    	let dealerBet = 32;
    	let betAmount = 0;
    	let maxBet = bankRoll;
    	let playerTurn = false;
    	let playerActions = "inactive";

    	function setName() {
    		let value = document.getElementById("player-name").value;
    		$$invalidate(1, playerName = value);
    	}

    	function setGame(name) {
    		$$invalidate(0, game = name);
    	}

    	function toggleTurn() {
    		playerTurn = !playerTurn;

    		if (playerTurn) {
    			$$invalidate(3, playerActions = "active");
    		} else {
    			$$invalidate(3, playerActions = "inactive");
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => setGame("texas");
    	const click_handler_1 = () => setGame("omaha5");

    	function input_change_input_handler() {
    		betAmount = to_number(this.value);
    		$$invalidate(2, betAmount);
    	}

    	$$self.$capture_state = () => ({
    		game,
    		playerName,
    		bankRoll,
    		dealerHand,
    		playerHand,
    		community,
    		pot,
    		showdown,
    		firstAction,
    		dealerBet,
    		betAmount,
    		maxBet,
    		playerTurn,
    		playerActions,
    		setName,
    		setGame,
    		toggleTurn
    	});

    	$$self.$inject_state = $$props => {
    		if ("game" in $$props) $$invalidate(0, game = $$props.game);
    		if ("playerName" in $$props) $$invalidate(1, playerName = $$props.playerName);
    		if ("bankRoll" in $$props) $$invalidate(4, bankRoll = $$props.bankRoll);
    		if ("dealerHand" in $$props) $$invalidate(5, dealerHand = $$props.dealerHand);
    		if ("playerHand" in $$props) $$invalidate(6, playerHand = $$props.playerHand);
    		if ("community" in $$props) $$invalidate(7, community = $$props.community);
    		if ("pot" in $$props) $$invalidate(8, pot = $$props.pot);
    		if ("showdown" in $$props) $$invalidate(9, showdown = $$props.showdown);
    		if ("firstAction" in $$props) $$invalidate(10, firstAction = $$props.firstAction);
    		if ("dealerBet" in $$props) $$invalidate(11, dealerBet = $$props.dealerBet);
    		if ("betAmount" in $$props) $$invalidate(2, betAmount = $$props.betAmount);
    		if ("maxBet" in $$props) $$invalidate(12, maxBet = $$props.maxBet);
    		if ("playerTurn" in $$props) playerTurn = $$props.playerTurn;
    		if ("playerActions" in $$props) $$invalidate(3, playerActions = $$props.playerActions);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		game,
    		playerName,
    		betAmount,
    		playerActions,
    		bankRoll,
    		dealerHand,
    		playerHand,
    		community,
    		pot,
    		showdown,
    		firstAction,
    		dealerBet,
    		maxBet,
    		setName,
    		setGame,
    		toggleTurn,
    		playerTurn,
    		click_handler,
    		click_handler_1,
    		input_change_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
