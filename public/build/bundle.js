
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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

    const cards = [
      "2C",
      "2D",
      "2H",
      "2S",
      "3C",
      "3D",
      "3H",
      "3S",
      "4C",
      "4D",
      "4H",
      "4S",
      "5C",
      "5D",
      "5H",
      "5S",
      "6C",
      "6D",
      "6H",
      "6S",
      "7C",
      "7D",
      "7H",
      "7S",
      "8C",
      "8D",
      "8H",
      "8S",
      "9C",
      "9D",
      "9H",
      "9S",
      "10C",
      "10D",
      "10H",
      "10S",
      "JC",
      "JD",
      "JH",
      "JS",
      "QC",
      "QD",
      "QH",
      "QS",
      "KC",
      "KD",
      "KH",
      "KS",
      "AC",
      "AD",
      "AH",
      "AS",
    ];

    function shuffle() {
      var currentIndex = cards.length,
        temporaryValue,
        randomIndex;

      while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = cards[currentIndex];
        cards[currentIndex] = cards[randomIndex];
        cards[randomIndex] = temporaryValue;
      }

      return cards;
    }

    /* src/App.svelte generated by Svelte v3.22.2 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    // (106:2) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let div4;
    	let div2;
    	let img;
    	let img_src_value;
    	let t1;
    	let span0;
    	let t4;
    	let div3;
    	let t5;
    	let div6;
    	let div5;
    	let t6;
    	let div14;
    	let div8;
    	let div7;
    	let span1;
    	let t8;
    	let input;
    	let t9;
    	let span2;
    	let div8_class_value;
    	let t12;
    	let div11;
    	let div9;
    	let span3;
    	let t14;
    	let div10;
    	let span4;
    	let div11_class_value;
    	let t16;
    	let div12;
    	let p0;
    	let t17;
    	let t18;
    	let hr;
    	let t19;
    	let p1;
    	let t22;
    	let div13;
    	let div13_class_value;
    	let dispose;
    	let each_value_2 = /*dealerHand*/ ctx[9];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*community*/ ctx[11];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*playerHand*/ ctx[10];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (!/*firstAction*/ ctx[14]) return create_if_block_2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t0 = space();
    			div4 = element("div");
    			div2 = element("div");
    			img = element("img");
    			t1 = space();
    			span0 = element("span");
    			span0.textContent = `\$${/*pot*/ ctx[12]}`;
    			t4 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			div6 = element("div");
    			div5 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			div14 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			span1 = element("span");
    			span1.textContent = "$0";
    			t8 = space();
    			input = element("input");
    			t9 = space();
    			span2 = element("span");
    			span2.textContent = `\$${/*maxBet*/ ctx[16]}`;
    			t12 = space();
    			div11 = element("div");
    			div9 = element("div");
    			span3 = element("span");
    			span3.textContent = "Fold";
    			t14 = space();
    			div10 = element("div");
    			span4 = element("span");
    			span4.textContent = "Check";
    			t16 = space();
    			div12 = element("div");
    			p0 = element("p");
    			t17 = text(/*playerName*/ ctx[1]);
    			t18 = space();
    			hr = element("hr");
    			t19 = space();
    			p1 = element("p");
    			p1.textContent = `\$${/*bank*/ ctx[8]}`;
    			t22 = space();
    			div13 = element("div");
    			if_block.c();
    			attr_dev(div0, "id", "dealer");
    			attr_dev(div0, "class", "hand");
    			set_style(div0, "width", /*dealerHandWidth*/ ctx[3] + "px");
    			add_location(div0, file, 107, 6, 2484);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file, 106, 4, 2454);
    			if (img.src !== (img_src_value = "images/poker-chip.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Poker Chip");
    			attr_dev(img, "height", "105%");
    			set_style(img, "margin-right", "10px");
    			add_location(img, file, 124, 8, 3036);
    			add_location(span0, file, 129, 8, 3177);
    			attr_dev(div2, "id", "pot");
    			attr_dev(div2, "class", /*potClass*/ ctx[4]);
    			add_location(div2, file, 123, 6, 2996);
    			attr_dev(div3, "id", "community");
    			attr_dev(div3, "class", "hand");
    			add_location(div3, file, 131, 6, 3216);
    			attr_dev(div4, "class", "container");
    			add_location(div4, file, 122, 4, 2966);
    			attr_dev(div5, "id", "player");
    			attr_dev(div5, "class", "hand");
    			set_style(div5, "width", /*playerHandWidth*/ ctx[2] + "px");
    			add_location(div5, file, 140, 6, 3492);
    			attr_dev(div6, "class", "container no-margin-bottom");
    			add_location(div6, file, 139, 4, 3445);
    			add_location(span1, file, 153, 10, 3992);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", /*maxBet*/ ctx[16]);
    			add_location(input, file, 154, 10, 4018);
    			add_location(span2, file, 160, 10, 4177);
    			attr_dev(div7, "class", "input-wrapper d-flex justify-center");
    			add_location(div7, file, 152, 8, 3932);
    			attr_dev(div8, "id", "bet-slider");
    			attr_dev(div8, "class", div8_class_value = "" + (/*playerActions*/ ctx[6] + " d-flex justify-center flex-wrap"));
    			add_location(div8, file, 149, 6, 3830);
    			add_location(span3, file, 165, 10, 4346);
    			attr_dev(div9, "class", "btn hover-effect");
    			add_location(div9, file, 164, 8, 4305);
    			add_location(span4, file, 168, 10, 4428);
    			attr_dev(div10, "class", "btn hover-effect");
    			add_location(div10, file, 167, 8, 4387);
    			attr_dev(div11, "class", div11_class_value = "left " + /*playerActions*/ ctx[6] + " actions d-flex align-center");
    			add_location(div11, file, 163, 6, 4234);
    			add_location(p0, file, 172, 8, 4556);
    			add_location(hr, file, 173, 8, 4584);
    			add_location(p1, file, 174, 8, 4599);
    			attr_dev(div12, "id", "player-info");
    			attr_dev(div12, "class", "d-flex column");
    			add_location(div12, file, 171, 6, 4481);
    			attr_dev(div13, "class", div13_class_value = "right " + /*playerActions*/ ctx[6] + " actions d-flex align-center");
    			add_location(div13, file, 176, 6, 4633);
    			attr_dev(div14, "class", "container d-flex justify-center flex-wrap no-margin-top");
    			add_location(div14, file, 148, 4, 3754);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div0, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div2);
    			append_dev(div2, img);
    			append_dev(div2, t1);
    			append_dev(div2, span0);
    			append_dev(div4, t4);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			insert_dev(target, t5, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div5, null);
    			}

    			insert_dev(target, t6, anchor);
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div8);
    			append_dev(div8, div7);
    			append_dev(div7, span1);
    			append_dev(div7, t8);
    			append_dev(div7, input);
    			set_input_value(input, /*betAmount*/ ctx[5]);
    			append_dev(div7, t9);
    			append_dev(div7, span2);
    			append_dev(div14, t12);
    			append_dev(div14, div11);
    			append_dev(div11, div9);
    			append_dev(div9, span3);
    			append_dev(div11, t14);
    			append_dev(div11, div10);
    			append_dev(div10, span4);
    			append_dev(div14, t16);
    			append_dev(div14, div12);
    			append_dev(div12, p0);
    			append_dev(p0, t17);
    			append_dev(div12, t18);
    			append_dev(div12, hr);
    			append_dev(div12, t19);
    			append_dev(div12, p1);
    			append_dev(div14, t22);
    			append_dev(div14, div13);
    			if_block.m(div13, null);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "change", /*input_change_input_handler*/ ctx[27]),
    				listen_dev(input, "input", /*input_change_input_handler*/ ctx[27]),
    				listen_dev(input, "input", /*checkAllIn*/ ctx[20], false, false, false),
    				listen_dev(div12, "click", /*toggleTurn*/ ctx[19], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*dealerHand, showdown*/ 8704) {
    				each_value_2 = /*dealerHand*/ ctx[9];
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

    			if (dirty[0] & /*dealerHandWidth*/ 8) {
    				set_style(div0, "width", /*dealerHandWidth*/ ctx[3] + "px");
    			}

    			if (dirty[0] & /*potClass*/ 16) {
    				attr_dev(div2, "class", /*potClass*/ ctx[4]);
    			}

    			if (dirty[0] & /*community*/ 2048) {
    				each_value_1 = /*community*/ ctx[11];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*playerHand*/ 1024) {
    				each_value = /*playerHand*/ ctx[10];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div5, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*playerHandWidth*/ 4) {
    				set_style(div5, "width", /*playerHandWidth*/ ctx[2] + "px");
    			}

    			if (dirty[0] & /*betAmount*/ 32) {
    				set_input_value(input, /*betAmount*/ ctx[5]);
    			}

    			if (dirty[0] & /*playerActions*/ 64 && div8_class_value !== (div8_class_value = "" + (/*playerActions*/ ctx[6] + " d-flex justify-center flex-wrap"))) {
    				attr_dev(div8, "class", div8_class_value);
    			}

    			if (dirty[0] & /*playerActions*/ 64 && div11_class_value !== (div11_class_value = "left " + /*playerActions*/ ctx[6] + " actions d-flex align-center")) {
    				attr_dev(div11, "class", div11_class_value);
    			}

    			if (dirty[0] & /*playerName*/ 2) set_data_dev(t17, /*playerName*/ ctx[1]);
    			if_block.p(ctx, dirty);

    			if (dirty[0] & /*playerActions*/ 64 && div13_class_value !== (div13_class_value = "right " + /*playerActions*/ ctx[6] + " actions d-flex align-center")) {
    				attr_dev(div13, "class", div13_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks_2, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div6);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div14);
    			if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(106:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (94:32) 
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
    			add_location(h1, file, 95, 6, 2127);
    			attr_dev(div0, "class", "btn hover-effect");
    			add_location(div0, file, 98, 10, 2231);
    			add_location(li0, file, 97, 8, 2182);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file, 101, 10, 2354);
    			add_location(li1, file, 100, 8, 2304);
    			attr_dev(ul, "id", "game-menu");
    			add_location(ul, file, 96, 6, 2154);
    			attr_dev(div2, "class", "container text-center");
    			add_location(div2, file, 94, 4, 2085);
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
    				listen_dev(li0, "click", /*click_handler*/ ctx[25], false, false, false),
    				listen_dev(li1, "click", /*click_handler_1*/ ctx[26], false, false, false)
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
    		source: "(94:32) ",
    		ctx
    	});

    	return block;
    }

    // (84:2) {#if !game && !playerName}
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
    			add_location(h1, file, 85, 6, 1811);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "player-name");
    			add_location(input, file, 87, 8, 1872);
    			attr_dev(div0, "id", "name-field");
    			add_location(div0, file, 86, 6, 1842);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file, 90, 8, 1964);
    			attr_dev(div2, "class", "btn-wrapper");
    			add_location(div2, file, 89, 6, 1930);
    			attr_dev(div3, "class", "container text-center");
    			add_location(div3, file, 84, 4, 1769);
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
    			dispose = listen_dev(div1, "click", /*setName*/ ctx[17], false, false, false);
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
    		source: "(84:2) {#if !game && !playerName}",
    		ctx
    	});

    	return block;
    }

    // (110:10) {#if !showdown}
    function create_if_block_4(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = "images/cards/card_back.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Card Back");
    			add_location(img, file, 111, 14, 2666);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file, 110, 12, 2623);
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
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(110:10) {#if !showdown}",
    		ctx
    	});

    	return block;
    }

    // (115:10) {#if showdown}
    function create_if_block_3(ctx) {
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
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[28] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[28]);
    			add_location(img, file, 116, 14, 2838);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file, 115, 12, 2795);
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
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(115:10) {#if showdown}",
    		ctx
    	});

    	return block;
    }

    // (109:8) {#each dealerHand as card}
    function create_each_block_2(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = !/*showdown*/ ctx[13] && create_if_block_4(ctx);
    	let if_block1 = /*showdown*/ ctx[13] && create_if_block_3(ctx);

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
    			if (/*showdown*/ ctx[13]) if_block1.p(ctx, dirty);
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
    		source: "(109:8) {#each dealerHand as card}",
    		ctx
    	});

    	return block;
    }

    // (133:8) {#each community as card}
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
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[28] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[28]);
    			add_location(img, file, 134, 12, 3335);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file, 133, 10, 3294);
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
    		source: "(133:8) {#each community as card}",
    		ctx
    	});

    	return block;
    }

    // (142:8) {#each playerHand as card}
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
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[28] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[28]);
    			add_location(img, file, 143, 12, 3644);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file, 142, 10, 3603);
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
    		source: "(142:8) {#each playerHand as card}",
    		ctx
    	});

    	return block;
    }

    // (185:10) {:else}
    function create_else_block_1(ctx) {
    	let div;
    	let span;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(/*action*/ ctx[7]);
    			t1 = space();
    			t2 = text(/*betAmount*/ ctx[5]);
    			add_location(span, file, 186, 12, 4999);
    			attr_dev(div, "class", "btn hover-effect");
    			add_location(div, file, 185, 10, 4956);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*action*/ 128) set_data_dev(t0, /*action*/ ctx[7]);
    			if (dirty[0] & /*betAmount*/ 32) set_data_dev(t2, /*betAmount*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(185:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (178:8) {#if !firstAction}
    function create_if_block_2(ctx) {
    	let div0;
    	let span0;
    	let t2;
    	let div1;
    	let span1;
    	let t3;
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = `Call ${/*dealerBet*/ ctx[15]}`;
    			t2 = space();
    			div1 = element("div");
    			span1 = element("span");
    			t3 = text(/*action*/ ctx[7]);
    			t4 = space();
    			t5 = text(/*betAmount*/ ctx[5]);
    			add_location(span0, file, 179, 12, 4777);
    			attr_dev(div0, "class", "btn hover-effect");
    			add_location(div0, file, 178, 10, 4734);
    			add_location(span1, file, 182, 12, 4877);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file, 181, 10, 4834);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, span0);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span1);
    			append_dev(span1, t3);
    			append_dev(span1, t4);
    			append_dev(span1, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*action*/ 128) set_data_dev(t3, /*action*/ ctx[7]);
    			if (dirty[0] & /*betAmount*/ 32) set_data_dev(t5, /*betAmount*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(178:8) {#if !firstAction}",
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
    			add_location(div, file, 82, 0, 1719);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
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
    	let playerNumCards = null;
    	let playerHandWidth = 160;
    	let dealerHandWidth = 100;
    	let bank = 1000;
    	let dealerHand = [];
    	let playerHand = [];
    	let community = [];
    	let pot = 0;
    	let potClass = "";
    	let showdown = false;
    	let firstAction = true;
    	let dealerBet = 32;
    	let betAmount = 0;
    	let maxBet = bank;
    	let playerTurn = false;
    	let playerActions = "inactive";
    	let action = "";

    	function setName() {
    		let value = document.getElementById("player-name").value;
    		$$invalidate(1, playerName = value);
    	}

    	function setGame(name) {
    		$$invalidate(0, game = name);

    		if (game === "texas") {
    			playerNumCards = 2;
    			setHandWidth();
    		}

    		if (game === "omaha5") {
    			playerNumCards = 5;
    			setHandWidth();
    		}

    		if (firstAction) {
    			$$invalidate(7, action = "Bet");
    		} else {
    			$$invalidate(7, action = "Raise");
    		}

    		let deck = shuffle();
    		deal(deck);

    		setTimeout(
    			() => {
    				$$invalidate(4, potClass = "active");
    			},
    			100
    		);
    	}

    	function setHandWidth(numCards) {
    		$$invalidate(2, playerHandWidth = playerNumCards * 100 + 60);
    		$$invalidate(3, dealerHandWidth = playerNumCards * 60 + 40);
    	}

    	function deal(deck) {
    		for (let i = 0; i < playerNumCards; i++) {
    			playerHand.push(deck[i]);
    			dealerHand.push(deck[i + 1]);
    		}

    		setTimeout(
    			function () {
    				toggleTurn();
    			},
    			200
    		);
    	}

    	function toggleTurn() {
    		playerTurn = !playerTurn;

    		if (playerTurn) {
    			$$invalidate(6, playerActions = "active");
    		} else {
    			$$invalidate(6, playerActions = "inactive");
    		}
    	}

    	function checkAllIn() {
    		if (betAmount === bank) {
    			$$invalidate(7, action = "Go All In");
    		} else {
    			if (firstAction) {
    				$$invalidate(7, action = "Bet");
    			} else {
    				$$invalidate(7, action = "Raise");
    			}
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
    		$$invalidate(5, betAmount);
    	}

    	$$self.$capture_state = () => ({
    		shuffle,
    		game,
    		playerName,
    		playerNumCards,
    		playerHandWidth,
    		dealerHandWidth,
    		bank,
    		dealerHand,
    		playerHand,
    		community,
    		pot,
    		potClass,
    		showdown,
    		firstAction,
    		dealerBet,
    		betAmount,
    		maxBet,
    		playerTurn,
    		playerActions,
    		action,
    		setName,
    		setGame,
    		setHandWidth,
    		deal,
    		toggleTurn,
    		checkAllIn
    	});

    	$$self.$inject_state = $$props => {
    		if ("game" in $$props) $$invalidate(0, game = $$props.game);
    		if ("playerName" in $$props) $$invalidate(1, playerName = $$props.playerName);
    		if ("playerNumCards" in $$props) playerNumCards = $$props.playerNumCards;
    		if ("playerHandWidth" in $$props) $$invalidate(2, playerHandWidth = $$props.playerHandWidth);
    		if ("dealerHandWidth" in $$props) $$invalidate(3, dealerHandWidth = $$props.dealerHandWidth);
    		if ("bank" in $$props) $$invalidate(8, bank = $$props.bank);
    		if ("dealerHand" in $$props) $$invalidate(9, dealerHand = $$props.dealerHand);
    		if ("playerHand" in $$props) $$invalidate(10, playerHand = $$props.playerHand);
    		if ("community" in $$props) $$invalidate(11, community = $$props.community);
    		if ("pot" in $$props) $$invalidate(12, pot = $$props.pot);
    		if ("potClass" in $$props) $$invalidate(4, potClass = $$props.potClass);
    		if ("showdown" in $$props) $$invalidate(13, showdown = $$props.showdown);
    		if ("firstAction" in $$props) $$invalidate(14, firstAction = $$props.firstAction);
    		if ("dealerBet" in $$props) $$invalidate(15, dealerBet = $$props.dealerBet);
    		if ("betAmount" in $$props) $$invalidate(5, betAmount = $$props.betAmount);
    		if ("maxBet" in $$props) $$invalidate(16, maxBet = $$props.maxBet);
    		if ("playerTurn" in $$props) playerTurn = $$props.playerTurn;
    		if ("playerActions" in $$props) $$invalidate(6, playerActions = $$props.playerActions);
    		if ("action" in $$props) $$invalidate(7, action = $$props.action);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		game,
    		playerName,
    		playerHandWidth,
    		dealerHandWidth,
    		potClass,
    		betAmount,
    		playerActions,
    		action,
    		bank,
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
    		checkAllIn,
    		playerNumCards,
    		playerTurn,
    		setHandWidth,
    		deal,
    		click_handler,
    		click_handler_1,
    		input_change_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1]);

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
