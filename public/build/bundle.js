
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
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

    /* src/ActionDialog.svelte generated by Svelte v3.22.2 */

    const file = "src/ActionDialog.svelte";

    // (53:0) {#if messageObj.action}
    function create_if_block(ctx) {
    	let div;
    	let t_value = /*messages*/ ctx[1][/*messageObj*/ ctx[0].action] + "";
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "id", "action-dialog");
    			attr_dev(div, "class", "container svelte-1oud35h");
    			add_location(div, file, 53, 2, 1220);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    			if (remount) dispose();
    			dispose = listen_dev(div, "load", /*setTimer*/ ctx[2](), false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*messages, messageObj*/ 3 && t_value !== (t_value = /*messages*/ ctx[1][/*messageObj*/ ctx[0].action] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(53:0) {#if messageObj.action}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let if_block = /*messageObj*/ ctx[0].action && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*messageObj*/ ctx[0].action) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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

    function setMessages(obj) {
    	return {
    		fold: `${obj.currPlayer} has folded, ${obj.othPlayer} wins ${obj.pot}`,
    		check: `${obj.currPlayer} has checked, ${obj.othPlayer}'s turn`,
    		call: `${obj.currPlayer} has called, ${obj.othPlayer}'s turn`,
    		raise: `${obj.currPlayer} has raised ${obj.amount}, ${obj.othPlayer}'s turn`,
    		bet: `${obj.currPlayer} has bet ${obj.amount}, ${obj.othPlayer}'s turn`
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { messageObj = {
    		currPlayer: null,
    		othPlayer: null,
    		pot: null,
    		amount: null,
    		action: null
    	} } = $$props;

    	let messages = {};

    	const setTimer = () => {
    		$$invalidate(1, messages = setMessages(messageObj));

    		setTimeout(
    			function () {
    				$$invalidate(0, messageObj = {
    					playerName: null,
    					pokerBot: false,
    					pot: null,
    					amount: null,
    					action: null
    				});
    			},
    			3000
    		);
    	};

    	
    	const writable_props = ["messageObj"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ActionDialog> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("ActionDialog", $$slots, []);

    	$$self.$set = $$props => {
    		if ("messageObj" in $$props) $$invalidate(0, messageObj = $$props.messageObj);
    	};

    	$$self.$capture_state = () => ({
    		messageObj,
    		messages,
    		setTimer,
    		setMessages
    	});

    	$$self.$inject_state = $$props => {
    		if ("messageObj" in $$props) $$invalidate(0, messageObj = $$props.messageObj);
    		if ("messages" in $$props) $$invalidate(1, messages = $$props.messages);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [messageObj, messages, setTimer];
    }

    class ActionDialog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { messageObj: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ActionDialog",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get messageObj() {
    		throw new Error("<ActionDialog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set messageObj(value) {
    		throw new Error("<ActionDialog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;
    const file$1 = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    // (184:2) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let div4;
    	let div3;
    	let div2;
    	let t1;
    	let t2;
    	let hr0;
    	let t3;
    	let p0;
    	let t4;
    	let t5_value = /*pokerBot*/ ctx[6].bank + "";
    	let t5;
    	let t6;
    	let div7;
    	let div5;
    	let img;
    	let img_src_value;
    	let t7;
    	let span0;
    	let t8;
    	let t9;
    	let t10;
    	let div6;
    	let t11;
    	let t12;
    	let div9;
    	let div8;
    	let t13;
    	let div18;
    	let div11;
    	let div10;
    	let span1;
    	let t15;
    	let input;
    	let t16;
    	let span2;
    	let t17;
    	let t18;
    	let div11_class_value;
    	let t19;
    	let div14;
    	let div12;
    	let span3;
    	let t21;
    	let div13;
    	let span4;
    	let div14_class_value;
    	let t23;
    	let div16;
    	let div15;
    	let t24;
    	let t25;
    	let t26;
    	let hr1;
    	let t27;
    	let p1;
    	let t28;
    	let t29_value = /*player*/ ctx[7].bank + "";
    	let t29;
    	let t30;
    	let div17;
    	let div17_class_value;
    	let current;
    	let dispose;
    	let each_value_2 = /*pokerBot*/ ctx[6].hand;
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block0 = /*pokerBot*/ ctx[6].dealer && create_if_block_6(ctx);

    	const actiondialog = new ActionDialog({
    			props: { messageObj: /*messageObj*/ ctx[12] },
    			$$inline: true
    		});

    	let each_value_1 = /*community*/ ctx[8];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*player*/ ctx[7].hand;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block1 = /*player*/ ctx[7].dealer && create_if_block_5(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!/*firstAction*/ ctx[13]) return create_if_block_2;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t0 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			t1 = text("Morgan's Poker Bot\n          ");
    			if (if_block0) if_block0.c();
    			t2 = space();
    			hr0 = element("hr");
    			t3 = space();
    			p0 = element("p");
    			t4 = text("$");
    			t5 = text(t5_value);
    			t6 = space();
    			div7 = element("div");
    			div5 = element("div");
    			img = element("img");
    			t7 = space();
    			span0 = element("span");
    			t8 = text("$");
    			t9 = text(/*pot*/ ctx[4]);
    			t10 = space();
    			div6 = element("div");
    			create_component(actiondialog.$$.fragment);
    			t11 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t12 = space();
    			div9 = element("div");
    			div8 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t13 = space();
    			div18 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			span1 = element("span");
    			span1.textContent = "$0";
    			t15 = space();
    			input = element("input");
    			t16 = space();
    			span2 = element("span");
    			t17 = text("$");
    			t18 = text(/*maxBet*/ ctx[10]);
    			t19 = space();
    			div14 = element("div");
    			div12 = element("div");
    			span3 = element("span");
    			span3.textContent = "Fold";
    			t21 = space();
    			div13 = element("div");
    			span4 = element("span");
    			span4.textContent = "Check";
    			t23 = space();
    			div16 = element("div");
    			div15 = element("div");
    			t24 = text(/*playerName*/ ctx[1]);
    			t25 = space();
    			if (if_block1) if_block1.c();
    			t26 = space();
    			hr1 = element("hr");
    			t27 = space();
    			p1 = element("p");
    			t28 = text("$");
    			t29 = text(t29_value);
    			t30 = space();
    			div17 = element("div");
    			if_block2.c();
    			attr_dev(div0, "id", "poker-bot");
    			attr_dev(div0, "class", "hand");
    			set_style(div0, "width", /*pokerBotHandWidth*/ ctx[2] + "px");
    			add_location(div0, file$1, 185, 6, 4199);
    			attr_dev(div1, "class", "container no-margin-bottom");
    			add_location(div1, file$1, 184, 4, 4152);
    			attr_dev(div2, "class", "d-flex justify-center");
    			set_style(div2, "margin-bottom", "8px");
    			add_location(div2, file$1, 205, 8, 4859);
    			add_location(hr0, file$1, 211, 8, 5067);
    			add_location(p0, file$1, 212, 8, 5082);
    			attr_dev(div3, "id", "poker-bot-info");
    			attr_dev(div3, "class", "d-flex column");
    			add_location(div3, file$1, 201, 6, 4750);
    			attr_dev(div4, "class", "container no-margin-bottom no-margin-top");
    			add_location(div4, file$1, 200, 4, 4689);
    			if (img.src !== (img_src_value = "images/poker-chip.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Poker Chip");
    			attr_dev(img, "height", "105%");
    			set_style(img, "margin-right", "10px");
    			add_location(img, file$1, 217, 8, 5204);
    			add_location(span0, file$1, 222, 8, 5345);
    			attr_dev(div5, "id", "pot");
    			attr_dev(div5, "class", /*potClass*/ ctx[14]);
    			add_location(div5, file$1, 216, 6, 5164);
    			attr_dev(div6, "id", "community");
    			attr_dev(div6, "class", "hand");
    			add_location(div6, file$1, 224, 6, 5384);
    			attr_dev(div7, "class", "container");
    			add_location(div7, file$1, 215, 4, 5134);
    			attr_dev(div8, "id", "player");
    			attr_dev(div8, "class", "hand");
    			set_style(div8, "width", /*playerHandWidth*/ ctx[3] + "px");
    			add_location(div8, file$1, 234, 6, 5698);
    			attr_dev(div9, "class", "container no-margin-bottom");
    			add_location(div9, file$1, 233, 4, 5651);
    			add_location(span1, file$1, 247, 10, 6199);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", /*maxBet*/ ctx[10]);
    			attr_dev(input, "step", "25");
    			add_location(input, file$1, 248, 10, 6225);
    			add_location(span2, file$1, 254, 10, 6372);
    			attr_dev(div10, "class", "input-wrapper d-flex justify-center");
    			add_location(div10, file$1, 246, 8, 6139);
    			attr_dev(div11, "id", "bet-slider");
    			attr_dev(div11, "class", div11_class_value = "" + (/*playerActions*/ ctx[5] + " d-flex justify-center flex-wrap"));
    			add_location(div11, file$1, 243, 6, 6037);
    			add_location(span3, file$1, 259, 10, 6570);
    			attr_dev(div12, "class", "btn hover-effect");
    			add_location(div12, file$1, 258, 8, 6500);
    			add_location(span4, file$1, 262, 10, 6686);
    			attr_dev(div13, "class", "btn hover-effect");
    			add_location(div13, file$1, 261, 8, 6611);
    			attr_dev(div14, "class", div14_class_value = "left " + /*playerActions*/ ctx[5] + " actions d-flex align-center");
    			add_location(div14, file$1, 257, 6, 6429);
    			attr_dev(div15, "class", "d-flex justify-center");
    			set_style(div15, "margin-bottom", "8px");
    			add_location(div15, file$1, 266, 8, 6792);
    			add_location(hr1, file$1, 272, 8, 6992);
    			add_location(p1, file$1, 273, 8, 7007);
    			attr_dev(div16, "id", "player-info");
    			attr_dev(div16, "class", "d-flex column");
    			add_location(div16, file$1, 265, 6, 6739);
    			attr_dev(div17, "class", div17_class_value = "right " + /*playerActions*/ ctx[5] + " actions d-flex align-center");
    			add_location(div17, file$1, 275, 6, 7048);
    			attr_dev(div18, "class", "container d-flex justify-center flex-wrap no-margin-top");
    			add_location(div18, file$1, 242, 4, 5961);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div0, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, t1);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div3, t2);
    			append_dev(div3, hr0);
    			append_dev(div3, t3);
    			append_dev(div3, p0);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div5);
    			append_dev(div5, img);
    			append_dev(div5, t7);
    			append_dev(div5, span0);
    			append_dev(span0, t8);
    			append_dev(span0, t9);
    			append_dev(div7, t10);
    			append_dev(div7, div6);
    			mount_component(actiondialog, div6, null);
    			append_dev(div6, t11);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div6, null);
    			}

    			insert_dev(target, t12, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div8, null);
    			}

    			insert_dev(target, t13, anchor);
    			insert_dev(target, div18, anchor);
    			append_dev(div18, div11);
    			append_dev(div11, div10);
    			append_dev(div10, span1);
    			append_dev(div10, t15);
    			append_dev(div10, input);
    			set_input_value(input, /*betAmount*/ ctx[9]);
    			append_dev(div10, t16);
    			append_dev(div10, span2);
    			append_dev(span2, t17);
    			append_dev(span2, t18);
    			append_dev(div18, t19);
    			append_dev(div18, div14);
    			append_dev(div14, div12);
    			append_dev(div12, span3);
    			append_dev(div14, t21);
    			append_dev(div14, div13);
    			append_dev(div13, span4);
    			append_dev(div18, t23);
    			append_dev(div18, div16);
    			append_dev(div16, div15);
    			append_dev(div15, t24);
    			append_dev(div15, t25);
    			if (if_block1) if_block1.m(div15, null);
    			append_dev(div16, t26);
    			append_dev(div16, hr1);
    			append_dev(div16, t27);
    			append_dev(div16, p1);
    			append_dev(p1, t28);
    			append_dev(p1, t29);
    			append_dev(div18, t30);
    			append_dev(div18, div17);
    			if_block2.m(div17, null);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(div3, "click", /*getPokerBotAction*/ ctx[20], false, false, false),
    				listen_dev(input, "change", /*input_change_input_handler*/ ctx[30]),
    				listen_dev(input, "input", /*input_change_input_handler*/ ctx[30]),
    				listen_dev(div12, "click", /*click_handler_2*/ ctx[31], false, false, false),
    				listen_dev(div13, "click", /*click_handler_3*/ ctx[32], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pokerBot, showdown*/ 32832) {
    				each_value_2 = /*pokerBot*/ ctx[6].hand;
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

    			if (!current || dirty[0] & /*pokerBotHandWidth*/ 4) {
    				set_style(div0, "width", /*pokerBotHandWidth*/ ctx[2] + "px");
    			}

    			if (/*pokerBot*/ ctx[6].dealer) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					if_block0.m(div2, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if ((!current || dirty[0] & /*pokerBot*/ 64) && t5_value !== (t5_value = /*pokerBot*/ ctx[6].bank + "")) set_data_dev(t5, t5_value);
    			if (!current || dirty[0] & /*pot*/ 16) set_data_dev(t9, /*pot*/ ctx[4]);

    			if (!current || dirty[0] & /*potClass*/ 16384) {
    				attr_dev(div5, "class", /*potClass*/ ctx[14]);
    			}

    			const actiondialog_changes = {};
    			if (dirty[0] & /*messageObj*/ 4096) actiondialog_changes.messageObj = /*messageObj*/ ctx[12];
    			actiondialog.$set(actiondialog_changes);

    			if (dirty[0] & /*community*/ 256) {
    				each_value_1 = /*community*/ ctx[8];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div6, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*player*/ 128) {
    				each_value = /*player*/ ctx[7].hand;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div8, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (!current || dirty[0] & /*playerHandWidth*/ 8) {
    				set_style(div8, "width", /*playerHandWidth*/ ctx[3] + "px");
    			}

    			if (!current || dirty[0] & /*maxBet*/ 1024) {
    				attr_dev(input, "max", /*maxBet*/ ctx[10]);
    			}

    			if (dirty[0] & /*betAmount*/ 512) {
    				set_input_value(input, /*betAmount*/ ctx[9]);
    			}

    			if (!current || dirty[0] & /*maxBet*/ 1024) set_data_dev(t18, /*maxBet*/ ctx[10]);

    			if (!current || dirty[0] & /*playerActions*/ 32 && div11_class_value !== (div11_class_value = "" + (/*playerActions*/ ctx[5] + " d-flex justify-center flex-wrap"))) {
    				attr_dev(div11, "class", div11_class_value);
    			}

    			if (!current || dirty[0] & /*playerActions*/ 32 && div14_class_value !== (div14_class_value = "left " + /*playerActions*/ ctx[5] + " actions d-flex align-center")) {
    				attr_dev(div14, "class", div14_class_value);
    			}

    			if (!current || dirty[0] & /*playerName*/ 2) set_data_dev(t24, /*playerName*/ ctx[1]);

    			if (/*player*/ ctx[7].dealer) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					if_block1.m(div15, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if ((!current || dirty[0] & /*player*/ 128) && t29_value !== (t29_value = /*player*/ ctx[7].bank + "")) set_data_dev(t29, t29_value);

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div17, null);
    				}
    			}

    			if (!current || dirty[0] & /*playerActions*/ 32 && div17_class_value !== (div17_class_value = "right " + /*playerActions*/ ctx[5] + " actions d-flex align-center")) {
    				attr_dev(div17, "class", div17_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(actiondialog.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(actiondialog.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks_2, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			if (if_block0) if_block0.d();
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div7);
    			destroy_component(actiondialog);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div9);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(div18);
    			if (if_block1) if_block1.d();
    			if_block2.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(184:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (172:32) 
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
    			add_location(h1, file$1, 173, 6, 3825);
    			attr_dev(div0, "class", "btn hover-effect");
    			add_location(div0, file$1, 176, 10, 3929);
    			add_location(li0, file$1, 175, 8, 3880);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file$1, 179, 10, 4052);
    			add_location(li1, file$1, 178, 8, 4002);
    			attr_dev(ul, "id", "game-menu");
    			add_location(ul, file$1, 174, 6, 3852);
    			attr_dev(div2, "class", "container text-center");
    			add_location(div2, file$1, 172, 4, 3783);
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
    				listen_dev(li0, "click", /*click_handler*/ ctx[28], false, false, false),
    				listen_dev(li1, "click", /*click_handler_1*/ ctx[29], false, false, false)
    			];
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(172:32) ",
    		ctx
    	});

    	return block;
    }

    // (162:2) {#if !game && !playerName}
    function create_if_block$1(ctx) {
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
    			add_location(h1, file$1, 163, 6, 3509);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "player-name");
    			add_location(input, file$1, 165, 8, 3570);
    			attr_dev(div0, "id", "name-field");
    			add_location(div0, file$1, 164, 6, 3540);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file$1, 168, 8, 3662);
    			attr_dev(div2, "class", "btn-wrapper");
    			add_location(div2, file$1, 167, 6, 3628);
    			attr_dev(div3, "class", "container text-center");
    			add_location(div3, file$1, 162, 4, 3467);
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
    			dispose = listen_dev(div1, "click", /*setName*/ ctx[16], false, false, false);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(162:2) {#if !game && !playerName}",
    		ctx
    	});

    	return block;
    }

    // (188:10) {#if !showdown}
    function create_if_block_8(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = "images/cards/card_back.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Card Back");
    			add_location(img, file$1, 189, 14, 4389);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 188, 12, 4346);
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
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(188:10) {#if !showdown}",
    		ctx
    	});

    	return block;
    }

    // (193:10) {#if showdown}
    function create_if_block_7(ctx) {
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
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[36] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[36]);
    			add_location(img, file$1, 194, 14, 4561);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 193, 12, 4518);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*pokerBot*/ 64 && img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[36] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*pokerBot*/ 64 && img_alt_value !== (img_alt_value = /*card*/ ctx[36])) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(193:10) {#if showdown}",
    		ctx
    	});

    	return block;
    }

    // (187:8) {#each pokerBot.hand as card}
    function create_each_block_2(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = !/*showdown*/ ctx[15] && create_if_block_8(ctx);
    	let if_block1 = /*showdown*/ ctx[15] && create_if_block_7(ctx);

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
    			if (/*showdown*/ ctx[15]) if_block1.p(ctx, dirty);
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
    		source: "(187:8) {#each pokerBot.hand as card}",
    		ctx
    	});

    	return block;
    }

    // (208:10) {#if pokerBot.dealer}
    function create_if_block_6(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "D";
    			attr_dev(div, "class", "dealer-chip");
    			add_location(div, file$1, 208, 12, 4995);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(208:10) {#if pokerBot.dealer}",
    		ctx
    	});

    	return block;
    }

    // (227:8) {#each community as card}
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
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[36] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[36]);
    			add_location(img, file$1, 228, 12, 5541);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 227, 10, 5500);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*community*/ 256 && img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[36] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*community*/ 256 && img_alt_value !== (img_alt_value = /*card*/ ctx[36])) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(227:8) {#each community as card}",
    		ctx
    	});

    	return block;
    }

    // (236:8) {#each player.hand as card}
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
    			if (img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[36] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*card*/ ctx[36]);
    			add_location(img, file$1, 237, 12, 5851);
    			attr_dev(div, "class", "card-container");
    			add_location(div, file$1, 236, 10, 5810);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*player*/ 128 && img.src !== (img_src_value = "images/cards/" + /*card*/ ctx[36] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*player*/ 128 && img_alt_value !== (img_alt_value = /*card*/ ctx[36])) {
    				attr_dev(img, "alt", img_alt_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(236:8) {#each player.hand as card}",
    		ctx
    	});

    	return block;
    }

    // (269:10) {#if player.dealer}
    function create_if_block_5(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "D";
    			attr_dev(div, "class", "dealer-chip");
    			add_location(div, file$1, 269, 12, 6920);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(269:10) {#if player.dealer}",
    		ctx
    	});

    	return block;
    }

    // (286:8) {:else}
    function create_else_block_2(ctx) {
    	let div;
    	let span;
    	let dispose;

    	function select_block_type_3(ctx, dirty) {
    		if (/*allIn*/ ctx[11]) return create_if_block_4;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			if_block.c();
    			add_location(span, file$1, 287, 12, 7557);
    			attr_dev(div, "class", "btn hover-effect");
    			add_location(div, file$1, 286, 10, 7482);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			if_block.m(span, null);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", /*click_handler_6*/ ctx[35], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(286:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (277:8) {#if !firstAction}
    function create_if_block_2(ctx) {
    	let div0;
    	let span0;
    	let t1;
    	let div1;
    	let span1;
    	let dispose;

    	function select_block_type_2(ctx, dirty) {
    		if (/*allIn*/ ctx[11]) return create_if_block_3;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Call";
    			t1 = space();
    			div1 = element("div");
    			span1 = element("span");
    			if_block.c();
    			add_location(span0, file$1, 278, 12, 7225);
    			attr_dev(div0, "class", "btn hover-effect");
    			add_location(div0, file$1, 277, 10, 7149);
    			add_location(span1, file$1, 281, 12, 7347);
    			attr_dev(div1, "class", "btn hover-effect");
    			add_location(div1, file$1, 280, 10, 7270);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, span0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span1);
    			if_block.m(span1, null);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(div0, "click", /*click_handler_4*/ ctx[33], false, false, false),
    				listen_dev(div1, "click", /*click_handler_5*/ ctx[34], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span1, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(277:8) {#if !firstAction}",
    		ctx
    	});

    	return block;
    }

    // (289:35) {:else}
    function create_else_block_3(ctx) {
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("Bet ");
    			t1 = text(/*betAmount*/ ctx[9]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*betAmount*/ 512) set_data_dev(t1, /*betAmount*/ ctx[9]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(289:35) {:else}",
    		ctx
    	});

    	return block;
    }

    // (289:14) {#if allIn}
    function create_if_block_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Go All In!");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(289:14) {#if allIn}",
    		ctx
    	});

    	return block;
    }

    // (283:35) {:else}
    function create_else_block_1(ctx) {
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("Raise ");
    			t1 = text(/*betAmount*/ ctx[9]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*betAmount*/ 512) set_data_dev(t1, /*betAmount*/ ctx[9]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(283:35) {:else}",
    		ctx
    	});

    	return block;
    }

    // (283:14) {#if allIn}
    function create_if_block_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Go All In!");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(283:14) {#if allIn}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*game*/ ctx[0] && !/*playerName*/ ctx[1]) return 0;
    		if (!/*game*/ ctx[0] && /*playerName*/ ctx[1]) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "id", "table");
    			add_location(div, file$1, 160, 0, 3417);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { game = null } = $$props;
    	let { playerName = null } = $$props;
    	let playerNumCards;
    	let { pokerBotHandWidth } = $$props;
    	let { playerHandWidth } = $$props;
    	let firstAction;
    	let { pot = 0 } = $$props;
    	let potClass;
    	let playerTurn;
    	let { playerActions } = $$props;
    	let { pokerBot = { hand: [], bank: 1000, dealer: true } } = $$props;
    	let { player = { hand: [], bank: 1000, dealer: false } } = $$props;
    	let { community = [] } = $$props;
    	let { betAmount = 0 } = $$props;
    	let { maxBet } = $$props;
    	let { allIn } = $$props;
    	let showdown;

    	let { messageObj = {
    		currPlayer: null,
    		othPlayer: null,
    		pot: null,
    		amount: null,
    		action: null
    	} } = $$props;

    	function setName() {
    		let value = document.getElementById("player-name").value;
    		$$invalidate(1, playerName = value);
    	}

    	function setGame(name) {
    		$$invalidate(0, game = name);

    		if (game === "texas") {
    			$$invalidate(21, playerNumCards = 2);
    		}

    		if (game === "omaha5") {
    			$$invalidate(21, playerNumCards = 5);
    		}

    		init();
    	}

    	function init() {
    		calculateBlind();
    		let deck = shuffle();
    		deal(deck);

    		setTimeout(
    			() => {
    				$$invalidate(22, playerTurn = true);
    				$$invalidate(14, potClass = "active");
    				$$invalidate(13, firstAction = true);
    			},
    			100
    		);
    	}

    	function calculateBlind() {
    		if (player.dealer) {
    			$$invalidate(6, pokerBot.bank -= 25, pokerBot);
    		} else {
    			$$invalidate(7, player.bank -= 25, player);
    		}

    		$$invalidate(4, pot += 25);
    		$$invalidate(10, maxBet = player.bank);
    		return;
    	}

    	function deal(deck) {
    		let card = 0;

    		for (let i = 0; i < playerNumCards; i++) {
    			player.hand.push(deck[card]);
    			card++;
    			pokerBot.hand.push(deck[card]);
    			card++;
    		}
    	}

    	function toggleTurn() {
    		$$invalidate(22, playerTurn = !playerTurn);

    		if (!playerTurn) {
    			$$invalidate(5, playerActions = "inactive");
    		} else {
    			$$invalidate(5, playerActions = "active");
    		}
    	}

    	function reset() {
    		$$invalidate(6, pokerBot.hand = [], pokerBot);
    		$$invalidate(7, player.hand = [], player);
    		$$invalidate(8, community = []);
    		$$invalidate(4, pot = 0);
    		$$invalidate(6, pokerBot.dealer = !pokerBot.dealer, pokerBot);
    		$$invalidate(7, player.dealer = !player.dealer, player);

    		if (pokerBot.dealer) {
    			$$invalidate(22, playerTurn = true);
    			$$invalidate(5, playerActions = "active");
    		} else {
    			$$invalidate(22, playerTurn = false);
    			$$invalidate(5, playerActions = "inactive");
    		}

    		calculateBlind();
    		let deck = shuffle();
    		deal(deck);
    	}

    	function fold(bot) {
    		if (bot) {
    			$$invalidate(12, messageObj.currPlayer = "Poker Bot", messageObj);
    			$$invalidate(12, messageObj.othPlayer = playerName, messageObj);
    			$$invalidate(7, player.bank += pot, player);
    		} else {
    			$$invalidate(12, messageObj.currPlayer = playerName, messageObj);
    			$$invalidate(12, messageObj.othPlayer = "Poker Bot", messageObj);
    			$$invalidate(6, pokerBot.bank += pot, pokerBot);
    		}

    		$$invalidate(12, messageObj.pot = pot, messageObj);
    		$$invalidate(12, messageObj.action = "fold", messageObj);
    		reset();
    	}

    	function endTurn(action) {
    		if (action === "check") {
    			toggleTurn();
    		}

    		setTimeout(getPokerBotAction, 2000);
    	}

    	async function getPokerBotAction() {
    		let max;
    		let actions = [];

    		if (firstAction) {
    			max = 3;
    			actions = ["fold", "check", "bet"];
    		} else {
    			max = 4;
    			actions = ["fold", "check", "call", "raise"];
    		}

    		let randomIndex = Math.floor(Math.random() * Math.floor(max));
    		let action = actions[randomIndex];
    		console.log(action);
    	} // if (action === "fold") {
    	//   fold(true)

    	const writable_props = [
    		"game",
    		"playerName",
    		"pokerBotHandWidth",
    		"playerHandWidth",
    		"pot",
    		"playerActions",
    		"pokerBot",
    		"player",
    		"community",
    		"betAmount",
    		"maxBet",
    		"allIn",
    		"messageObj"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => setGame("texas");
    	const click_handler_1 = () => setGame("omaha5");

    	function input_change_input_handler() {
    		betAmount = to_number(this.value);
    		$$invalidate(9, betAmount);
    	}

    	const click_handler_2 = () => fold(false);
    	const click_handler_3 = () => endTurn("check");
    	const click_handler_4 = () => endTurn("call");
    	const click_handler_5 = () => endTurn("raise");
    	const click_handler_6 = () => endTurn("bet");

    	$$self.$set = $$props => {
    		if ("game" in $$props) $$invalidate(0, game = $$props.game);
    		if ("playerName" in $$props) $$invalidate(1, playerName = $$props.playerName);
    		if ("pokerBotHandWidth" in $$props) $$invalidate(2, pokerBotHandWidth = $$props.pokerBotHandWidth);
    		if ("playerHandWidth" in $$props) $$invalidate(3, playerHandWidth = $$props.playerHandWidth);
    		if ("pot" in $$props) $$invalidate(4, pot = $$props.pot);
    		if ("playerActions" in $$props) $$invalidate(5, playerActions = $$props.playerActions);
    		if ("pokerBot" in $$props) $$invalidate(6, pokerBot = $$props.pokerBot);
    		if ("player" in $$props) $$invalidate(7, player = $$props.player);
    		if ("community" in $$props) $$invalidate(8, community = $$props.community);
    		if ("betAmount" in $$props) $$invalidate(9, betAmount = $$props.betAmount);
    		if ("maxBet" in $$props) $$invalidate(10, maxBet = $$props.maxBet);
    		if ("allIn" in $$props) $$invalidate(11, allIn = $$props.allIn);
    		if ("messageObj" in $$props) $$invalidate(12, messageObj = $$props.messageObj);
    	};

    	$$self.$capture_state = () => ({
    		shuffle,
    		ActionDialog,
    		game,
    		playerName,
    		playerNumCards,
    		pokerBotHandWidth,
    		playerHandWidth,
    		firstAction,
    		pot,
    		potClass,
    		playerTurn,
    		playerActions,
    		pokerBot,
    		player,
    		community,
    		betAmount,
    		maxBet,
    		allIn,
    		showdown,
    		messageObj,
    		setName,
    		setGame,
    		init,
    		calculateBlind,
    		deal,
    		toggleTurn,
    		reset,
    		fold,
    		endTurn,
    		getPokerBotAction
    	});

    	$$self.$inject_state = $$props => {
    		if ("game" in $$props) $$invalidate(0, game = $$props.game);
    		if ("playerName" in $$props) $$invalidate(1, playerName = $$props.playerName);
    		if ("playerNumCards" in $$props) $$invalidate(21, playerNumCards = $$props.playerNumCards);
    		if ("pokerBotHandWidth" in $$props) $$invalidate(2, pokerBotHandWidth = $$props.pokerBotHandWidth);
    		if ("playerHandWidth" in $$props) $$invalidate(3, playerHandWidth = $$props.playerHandWidth);
    		if ("firstAction" in $$props) $$invalidate(13, firstAction = $$props.firstAction);
    		if ("pot" in $$props) $$invalidate(4, pot = $$props.pot);
    		if ("potClass" in $$props) $$invalidate(14, potClass = $$props.potClass);
    		if ("playerTurn" in $$props) $$invalidate(22, playerTurn = $$props.playerTurn);
    		if ("playerActions" in $$props) $$invalidate(5, playerActions = $$props.playerActions);
    		if ("pokerBot" in $$props) $$invalidate(6, pokerBot = $$props.pokerBot);
    		if ("player" in $$props) $$invalidate(7, player = $$props.player);
    		if ("community" in $$props) $$invalidate(8, community = $$props.community);
    		if ("betAmount" in $$props) $$invalidate(9, betAmount = $$props.betAmount);
    		if ("maxBet" in $$props) $$invalidate(10, maxBet = $$props.maxBet);
    		if ("allIn" in $$props) $$invalidate(11, allIn = $$props.allIn);
    		if ("showdown" in $$props) $$invalidate(15, showdown = $$props.showdown);
    		if ("messageObj" in $$props) $$invalidate(12, messageObj = $$props.messageObj);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*playerNumCards*/ 2097152) {
    			 $$invalidate(2, pokerBotHandWidth = playerNumCards * 60 + 40);
    		}

    		if ($$self.$$.dirty[0] & /*playerNumCards*/ 2097152) {
    			 $$invalidate(3, playerHandWidth = playerNumCards * 100 + 60);
    		}

    		if ($$self.$$.dirty[0] & /*playerTurn*/ 4194304) {
    			 $$invalidate(5, playerActions = playerTurn ? "active" : "inactive");
    		}

    		if ($$self.$$.dirty[0] & /*player*/ 128) {
    			 $$invalidate(10, maxBet = player.bank);
    		}

    		if ($$self.$$.dirty[0] & /*betAmount, player*/ 640) {
    			 $$invalidate(11, allIn = betAmount === player.bank ? true : false);
    		}
    	};

    	return [
    		game,
    		playerName,
    		pokerBotHandWidth,
    		playerHandWidth,
    		pot,
    		playerActions,
    		pokerBot,
    		player,
    		community,
    		betAmount,
    		maxBet,
    		allIn,
    		messageObj,
    		firstAction,
    		potClass,
    		showdown,
    		setName,
    		setGame,
    		fold,
    		endTurn,
    		getPokerBotAction,
    		playerNumCards,
    		playerTurn,
    		init,
    		calculateBlind,
    		deal,
    		toggleTurn,
    		reset,
    		click_handler,
    		click_handler_1,
    		input_change_input_handler,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				game: 0,
    				playerName: 1,
    				pokerBotHandWidth: 2,
    				playerHandWidth: 3,
    				pot: 4,
    				playerActions: 5,
    				pokerBot: 6,
    				player: 7,
    				community: 8,
    				betAmount: 9,
    				maxBet: 10,
    				allIn: 11,
    				messageObj: 12
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*pokerBotHandWidth*/ ctx[2] === undefined && !("pokerBotHandWidth" in props)) {
    			console_1.warn("<App> was created without expected prop 'pokerBotHandWidth'");
    		}

    		if (/*playerHandWidth*/ ctx[3] === undefined && !("playerHandWidth" in props)) {
    			console_1.warn("<App> was created without expected prop 'playerHandWidth'");
    		}

    		if (/*playerActions*/ ctx[5] === undefined && !("playerActions" in props)) {
    			console_1.warn("<App> was created without expected prop 'playerActions'");
    		}

    		if (/*maxBet*/ ctx[10] === undefined && !("maxBet" in props)) {
    			console_1.warn("<App> was created without expected prop 'maxBet'");
    		}

    		if (/*allIn*/ ctx[11] === undefined && !("allIn" in props)) {
    			console_1.warn("<App> was created without expected prop 'allIn'");
    		}
    	}

    	get game() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set game(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get playerName() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set playerName(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pokerBotHandWidth() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pokerBotHandWidth(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get playerHandWidth() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set playerHandWidth(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pot() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pot(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get playerActions() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set playerActions(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pokerBot() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pokerBot(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get player() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set player(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get community() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set community(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get betAmount() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set betAmount(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get maxBet() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set maxBet(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allIn() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allIn(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get messageObj() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set messageObj(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
